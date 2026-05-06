import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Field, MerkleMap, MerkleMapWitness } from 'o1js';
import { TournamentLeaf } from '../../../../../mina-contracts/src/TournamentManager.js';
import {
  Tournament,
  TournamentDocument,
} from '../../schemas/tournament.schema.js';
import {
  PendingOperation,
  PendingOperationDocument,
  OperationStatus,
} from '../../schemas/pending-operation.schema.js';
import { MerkleService } from '../merkle/merkle.service.js';
import { OperationEventsService } from '../events/operation-events.service.js';
import { TournamentSnapshot } from './tournament-snapshot.types.js';
import {
  applyOperationToSnapshot,
  snapshotFromDocument,
} from './tournament-mutation.util.js';

/**
 * Snapshot + Merkle artefacts assembled from verified state plus an ordered
 * stack of pending mutations that have already had a proof generated but
 * have not yet been confirmed on-chain.
 */
export interface OverlayContext {
  /** In-memory snapshot of the target tournament after pending mutations. */
  snapshot: TournamentSnapshot;
  /** Ordered list of pending ops (Submitted) folded into the snapshot. */
  foldedOps: PendingOperationDocument[];
  /** Participants map matching {@link snapshot} (overlay roots). */
  participantsMap: MerkleMap;
  /** Winners map matching {@link snapshot}. */
  winnersMap: MerkleMap;
  /** Global tournaments map with every tournament folded to its overlay leaf. */
  tournamentsMap: MerkleMap;
  /** Provable leaf for the target tournament at overlay state. */
  leaf: TournamentLeaf;
  /** Witness for the target tournament's slot in {@link tournamentsMap}. */
  tournamentWitness: MerkleMapWitness;
  /** Tournaments root computed from {@link tournamentsMap}. */
  tournamentsRoot: Field;
}

const STATUSES_IN_FLIGHT: OperationStatus[] = [
  OperationStatus.Submitted,
];

/**
 * Builds optimistic state on top of the persisted/verified tournament state
 * by replaying every in-flight mutation that has already been turned into a
 * proof but is still awaiting on-chain inclusion.
 *
 * Without this layer, two concurrent proofs for the same tournament would
 * both reference the verified Merkle roots; whichever transaction reaches
 * the chain second is then guaranteed to be rejected because its
 * `getAndRequireEquals` checks fail. The overlay folds in-flight mutations
 * into a transient snapshot so the second proof commits to a witness chain
 * that *will* match once the first transaction is included.
 *
 * Cross-tournament reads are also folded into the global tournaments map so
 * the overlay matches what `tournamentsRoot` will be once all in-flight
 * transactions confirm in submission order.
 *
 * Limitation: the overlay only stays consistent with the chain if pending
 * transactions are included in insertion order. Mina does not guarantee
 * mempool ordering across senders, so a chain-side rejection still cascades
 * through the overlay (handled by `invalidateDependents`).
 */
@Injectable()
export class TournamentOptimisticOverlayService {
  private readonly logger = new Logger(TournamentOptimisticOverlayService.name);

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    @InjectModel(PendingOperation.name)
    private readonly pendingOpModel: Model<PendingOperationDocument>,
    private readonly merkleService: MerkleService,
    private readonly operationEventsService: OperationEventsService
  ) {}

  /**
   * Build the overlay context for a specific operation about to be proven.
   * Folds every {@link OperationStatus.Submitted} op for the same tournament
   * with `_id < op._id` into the snapshot, plus every Submitted op for
   * other tournaments into the global map.
   */
  async getOverlayForOperation(
    op: PendingOperationDocument
  ): Promise<OverlayContext> {
    return this.computeOverlay(op.tournamentId, op._id);
  }

  /**
   * Build the overlay context as it currently stands (every Submitted op
   * folded in). Used by view/debug endpoints rather than the proof path.
   */
  async getCurrentOverlay(tournamentId: string): Promise<OverlayContext> {
    return this.computeOverlay(tournamentId, undefined);
  }

  /**
   * After an op transitions to a terminal failure state, mark every
   * later-in-flight op for the same tournament as failed too: their
   * proofs were generated against this op's pending mutation and would now
   * be witness-stale.
   *
   * Returns the list of operation ids that were invalidated.
   */
  async invalidateDependents(
    tournamentId: string,
    failedOpId: string | Types.ObjectId,
    reasonSummary: string
  ): Promise<string[]> {
    const failedObjectId =
      typeof failedOpId === 'string'
        ? new Types.ObjectId(failedOpId)
        : failedOpId;

    const dependents = await this.pendingOpModel
      .find({
        tournamentId,
        _id: { $gt: failedObjectId },
        status: { $in: [OperationStatus.Submitted, OperationStatus.Proving] },
      })
      .sort({ _id: 1 })
      .exec();

    if (dependents.length === 0) {
      return [];
    }

    const invalidatedIds: string[] = [];
    for (const dep of dependents) {
      const updated = await this.pendingOpModel
        .findOneAndUpdate(
          {
            _id: dep._id,
            status: { $in: [OperationStatus.Submitted, OperationStatus.Proving] },
          },
          {
            $set: {
              status: OperationStatus.Failed,
              error: `dependent_op_failed: ${reasonSummary}`,
            },
          },
          { new: true }
        )
        .exec();

      if (!updated) {
        continue;
      }

      invalidatedIds.push(updated._id.toString());

      this.operationEventsService.emit({
        operationId: updated._id.toString(),
        tournamentId: updated.tournamentId,
        status: updated.status,
        unsignedTxJson: updated.unsignedTxJson,
        txHash: updated.txHash,
        error: updated.error,
        updatedAt: updated.updatedAt ?? new Date(),
      });
    }

    if (invalidatedIds.length > 0) {
      this.logger.warn(
        `Invalidated ${invalidatedIds.length} dependent op(s) for tournament ${tournamentId} ` +
          `after ${failedObjectId.toString()} failed: [${invalidatedIds.join(', ')}]`
      );
    }

    return invalidatedIds;
  }

  private async computeOverlay(
    targetTournamentId: string,
    upperBoundOpId: Types.ObjectId | undefined
  ): Promise<OverlayContext> {
    const targetTournament = await this.tournamentModel
      .findOne({ tournamentId: targetTournamentId })
      .exec();
    if (!targetTournament) {
      throw new Error(`Tournament ${targetTournamentId} not found`);
    }

    const allTournaments = await this.tournamentModel.find().exec();
    const inFlightOps = await this.pendingOpModel
      .find({
        status: { $in: STATUSES_IN_FLIGHT },
        $or: [
          { tournamentId: { $ne: targetTournamentId } },
          ...(upperBoundOpId
            ? [
                {
                  tournamentId: targetTournamentId,
                  _id: { $lt: upperBoundOpId },
                },
              ]
            : [{ tournamentId: targetTournamentId }]),
        ],
      })
      .sort({ _id: 1 })
      .exec();

    const opsByTournament = new Map<string, PendingOperationDocument[]>();
    for (const op of inFlightOps) {
      const list = opsByTournament.get(op.tournamentId) ?? [];
      list.push(op);
      opsByTournament.set(op.tournamentId, list);
    }

    const tournamentsMap = new MerkleMap();
    let targetSnapshot: TournamentSnapshot | null = null;
    let targetParticipantsMap: MerkleMap | null = null;
    let targetWinnersMap: MerkleMap | null = null;
    let targetLeaf: TournamentLeaf | null = null;
    let foldedTargetOps: PendingOperationDocument[] = [];

    for (const t of allTournaments) {
      const isTarget = t.tournamentId === targetTournamentId;
      const opsToFold = opsByTournament.get(t.tournamentId) ?? [];

      const snapshot = snapshotFromDocument(t);
      for (const op of opsToFold) {
        try {
          applyOperationToSnapshot(snapshot, op);
        } catch (err) {
          throw new Error(
            `Failed to fold pending op ${op._id} (${op.type}) into ` +
              `tournament ${t.tournamentId} overlay: ${
                err instanceof Error ? err.message : String(err)
              }`
          );
        }
      }

      const participantsMap = this.merkleService.buildParticipantsMap(
        snapshot.participants
      );
      const winnersMap = this.merkleService.buildWinnersMap(snapshot.winners);
      const leaf = this.merkleService.buildTournamentLeafFromSnapshot(
        snapshot,
        participantsMap.getRoot(),
        winnersMap.getRoot()
      );

      const key = MerkleService.keyFor(Field(t.tournamentId));
      tournamentsMap.set(key, leaf.hash());

      if (isTarget) {
        targetSnapshot = snapshot;
        targetParticipantsMap = participantsMap;
        targetWinnersMap = winnersMap;
        targetLeaf = leaf;
        foldedTargetOps = opsToFold;
      }
    }

    if (
      !targetSnapshot ||
      !targetParticipantsMap ||
      !targetWinnersMap ||
      !targetLeaf
    ) {
      throw new Error(
        `Tournament ${targetTournamentId} disappeared during overlay build`
      );
    }

    const targetKey = MerkleService.keyFor(Field(targetTournamentId));
    const tournamentWitness = tournamentsMap.getWitness(targetKey);
    const tournamentsRoot = tournamentsMap.getRoot();

    if (foldedTargetOps.length > 0) {
      const opSummary = foldedTargetOps
        .map((o) => `${o.type}/${o._id}`)
        .join(', ');
      this.logger.debug(
        `Overlay for tournament ${targetTournamentId}: folded ${foldedTargetOps.length} pending op(s) [${opSummary}]`
      );
    }

    return {
      snapshot: targetSnapshot,
      foldedOps: foldedTargetOps,
      participantsMap: targetParticipantsMap,
      winnersMap: targetWinnersMap,
      tournamentsMap,
      leaf: targetLeaf,
      tournamentWitness,
      tournamentsRoot,
    };
  }
}
