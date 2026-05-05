import { Injectable, Logger } from '@nestjs/common';
import {
  MerkleMap,
  Field,
  Poseidon,
  PublicKey,
  MerkleMapWitness,
  Bool,
  UInt64,
  UInt32,
} from 'o1js';
import {
  WinnerLeaf,
  TournamentLeaf,
  TournamentStatus as ContractTournamentStatus,
  NUM_WINNERS,
} from '../../../../../mina-contracts/src/TournamentManager.js';
import {
  TournamentDocument,
  TournamentStatus,
  WinnerInfo,
} from '../../schemas/tournament.schema.js';
import type { TournamentSnapshot } from '../state/tournament-snapshot.types.js';

export interface TournamentWitnessData {
  tournamentWitness: MerkleMapWitness;
  tournamentKey: Field;
}

export interface ParticipantWitnessData {
  participantWitness: MerkleMapWitness;
  participantKey: Field;
}

export interface WinnerWitnessData {
  winnerWitness: MerkleMapWitness;
  winnerKey: Field;
  winnerLeaf: WinnerLeaf;
}

@Injectable()
export class MerkleService {
  private readonly logger = new Logger(MerkleService.name);
  private readonly emptyRoot: string;

  constructor() {
    this.emptyRoot = new MerkleMap().getRoot().toString();
  }

  getEmptyRoot(): string {
    return this.emptyRoot;
  }

  static keyFor(tournamentId: Field): Field {
    return Poseidon.hash([tournamentId]);
  }

  static keyForPublicKey(pk: PublicKey): Field {
    return Poseidon.hash(pk.toFields());
  }

  buildTournamentsMap(tournaments: TournamentDocument[]): MerkleMap {
    const map = new MerkleMap();

    for (const tournament of tournaments) {
      const tournamentId = Field(tournament.tournamentId);
      const key = MerkleService.keyFor(tournamentId);
      const leafHash = this.computeTournamentLeafHash(tournament);
      map.set(key, leafHash);
    }

    return map;
  }

  buildParticipantsMap(
    participants: Map<string, boolean> | Record<string, boolean>
  ): MerkleMap {
    const map = new MerkleMap();

    const entries =
      participants instanceof Map
        ? Array.from(participants.entries())
        : Object.entries(participants);

    for (const [pubKeyStr, registered] of entries) {
      if (registered) {
        const pubKey = PublicKey.fromBase58(pubKeyStr);
        const key = MerkleService.keyForPublicKey(pubKey);
        map.set(key, Field(1));
      }
    }

    return map;
  }

  /**
   * Build a `TournamentLeaf` (provable struct) from a backend document so we
   * always derive the leaf hash via the shared `TournamentLeaf.hash()` method.
   * This guarantees off-chain storage and on-chain proofs cannot drift apart
   * when the leaf shape changes.
   */
  buildTournamentLeaf(tournament: TournamentDocument): TournamentLeaf {
    return this.buildTournamentLeafFromFields({
      status: tournament.verified.status,
      battleStartSlot: tournament.verified.battleStartSlot,
      battleEndSlot: tournament.verified.battleEndSlot,
      claimDeadlineSlot: tournament.verified.claimDeadlineSlot,
      ticketPrice: tournament.verified.ticketPrice,
      feePercent: tournament.verified.feePercent,
      prizePercents: tournament.verified.prizePercents,
      participantsRoot: tournament.verified.participantsRoot,
      winnersRoot: tournament.verified.winnersRoot,
      prizePool: tournament.verified.prizePool,
      participantCount: tournament.verified.participantCount,
      sponsorContribution: tournament.verified.sponsorContribution ?? '0',
    });
  }

  /**
   * Build a `TournamentLeaf` from an in-memory {@link TournamentSnapshot}
   * plus the freshly-computed Merkle roots. Used by the optimistic-overlay
   * pipeline so a proof can reference state that includes pending mutations
   * still en route to the chain.
   */
  buildTournamentLeafFromSnapshot(
    snapshot: TournamentSnapshot,
    participantsRoot: Field,
    winnersRoot: Field
  ): TournamentLeaf {
    return this.buildTournamentLeafFromFields({
      status: snapshot.status,
      battleStartSlot: snapshot.battleStartSlot,
      battleEndSlot: snapshot.battleEndSlot,
      claimDeadlineSlot: snapshot.claimDeadlineSlot,
      ticketPrice: snapshot.ticketPrice,
      feePercent: snapshot.feePercent,
      prizePercents: snapshot.prizePercents,
      participantsRoot: participantsRoot.toString(),
      winnersRoot: winnersRoot.toString(),
      prizePool: snapshot.prizePool.toString(),
      participantCount: snapshot.participantCount,
      sponsorContribution: snapshot.sponsorContribution.toString(),
    });
  }

  private buildTournamentLeafFromFields(fields: {
    status: TournamentStatus;
    battleStartSlot: number;
    battleEndSlot: number;
    claimDeadlineSlot: number;
    ticketPrice: string;
    feePercent: number;
    prizePercents: number[];
    participantsRoot: string;
    winnersRoot: string;
    prizePool: string;
    participantCount: number;
    sponsorContribution: string;
  }): TournamentLeaf {
    const statusByName: Record<TournamentStatus, UInt32> = {
      [TournamentStatus.Created]: ContractTournamentStatus.Created,
      [TournamentStatus.Battle]: ContractTournamentStatus.Battle,
      [TournamentStatus.Claiming]: ContractTournamentStatus.Claiming,
      [TournamentStatus.Settled]: ContractTournamentStatus.Settled,
    };

    const status = statusByName[fields.status];
    if (!status) {
      throw new Error(`Unknown tournament status: ${fields.status}`);
    }

    return new TournamentLeaf({
      status,
      battleStartSlot: UInt32.from(fields.battleStartSlot),
      battleEndSlot: UInt32.from(fields.battleEndSlot),
      claimDeadlineSlot: UInt32.from(fields.claimDeadlineSlot),
      ticketPrice: UInt64.from(BigInt(fields.ticketPrice)),
      feePercent: UInt32.from(fields.feePercent),
      prizePercents: Array.from({ length: NUM_WINNERS }, (_, i) =>
        UInt32.from(fields.prizePercents[i] ?? 0)
      ),
      participantsRoot: Field(fields.participantsRoot),
      winnersRoot: Field(fields.winnersRoot),
      prizePool: UInt64.from(BigInt(fields.prizePool)),
      participantCount: UInt32.from(fields.participantCount),
      sponsorContribution: UInt64.from(BigInt(fields.sponsorContribution)),
    });
  }

  computeTournamentLeafHash(tournament: TournamentDocument): Field {
    return this.buildTournamentLeaf(tournament).hash();
  }

  getTournamentWitness(
    tournamentsMap: MerkleMap,
    tournamentId: string
  ): TournamentWitnessData {
    const tournamentIdField = Field(tournamentId);
    const key = MerkleService.keyFor(tournamentIdField);
    const witness = tournamentsMap.getWitness(key);

    return {
      tournamentWitness: witness,
      tournamentKey: key,
    };
  }

  getParticipantWitness(
    participantsMap: MerkleMap,
    playerPubKey: string
  ): ParticipantWitnessData {
    const pubKey = PublicKey.fromBase58(playerPubKey);
    const key = MerkleService.keyForPublicKey(pubKey);
    const witness = participantsMap.getWitness(key);

    return {
      participantWitness: witness,
      participantKey: key,
    };
  }

  verifyTournamentWitness(
    witness: MerkleMapWitness,
    leafHash: Field,
    expectedRoot: string
  ): boolean {
    const [computedRoot] = witness.computeRootAndKey(leafHash);
    return computedRoot?.equals(Field(expectedRoot)).toBoolean() ?? false;
  }

  verifyParticipantNotRegistered(
    participantsMap: MerkleMap,
    playerPubKey: string
  ): boolean {
    const pubKey = PublicKey.fromBase58(playerPubKey);
    const key = MerkleService.keyForPublicKey(pubKey);
    const value = participantsMap.get(key);
    return value.equals(Field(0)).toBoolean();
  }

  computeNewParticipantsRoot(
    participantsMap: MerkleMap,
    playerPubKey: string
  ): { newRoot: Field; witness: MerkleMapWitness } {
    const pubKey = PublicKey.fromBase58(playerPubKey);
    const key = MerkleService.keyForPublicKey(pubKey);
    const witness = participantsMap.getWitness(key);

    participantsMap.set(key, Field(1));
    const newRoot = participantsMap.getRoot();

    return { newRoot, witness };
  }

  computeNewTournamentsRoot(
    tournamentsMap: MerkleMap,
    tournamentId: string,
    newLeafHash: Field
  ): { newRoot: Field; witness: MerkleMapWitness } {
    const tournamentIdField = Field(tournamentId);
    const key = MerkleService.keyFor(tournamentIdField);
    const witness = tournamentsMap.getWitness(key);

    tournamentsMap.set(key, newLeafHash);
    const newRoot = tournamentsMap.getRoot();

    return { newRoot, witness };
  }

  buildWinnersMap(
    winners: Map<string, WinnerInfo> | Record<string, WinnerInfo>
  ): MerkleMap {
    const map = new MerkleMap();

    const entries =
      winners instanceof Map
        ? Array.from(winners.entries())
        : Object.entries(winners);

    for (const [pubKeyStr, info] of entries) {
      const pubKey = PublicKey.fromBase58(pubKeyStr);
      const key = MerkleService.keyForPublicKey(pubKey);
      const leaf = new WinnerLeaf({
        prizeAmount: UInt64.from(BigInt(info.prizeAmount)),
        claimed: Bool(info.claimed),
      });
      map.set(key, leaf.hash());
    }

    return map;
  }

  getWinnerWitness(
    winnersMap: MerkleMap,
    playerPubKey: string,
    winnerInfo: WinnerInfo
  ): WinnerWitnessData {
    const pubKey = PublicKey.fromBase58(playerPubKey);
    const key = MerkleService.keyForPublicKey(pubKey);
    const witness = winnersMap.getWitness(key);
    const winnerLeaf = new WinnerLeaf({
      prizeAmount: UInt64.from(BigInt(winnerInfo.prizeAmount)),
      claimed: Bool(winnerInfo.claimed),
    });

    return { winnerWitness: witness, winnerKey: key, winnerLeaf };
  }
}
