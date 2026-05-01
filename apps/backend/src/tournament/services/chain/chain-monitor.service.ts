import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TournamentStateService } from '../state/tournament-state.service.js';
import { MinaClientService } from './mina-client.service.js';
import { MerkleService } from '../merkle/merkle.service.js';
import { TournamentLeaderboardService } from '../matches/tournament-leaderboard.service.js';
import {
  OperationStatus,
  OperationType,
  PendingOperationDocument,
} from '../../schemas/pending-operation.schema.js';
import { TournamentStatus } from '../../schemas/tournament.schema.js';

export interface WinnerInfo {
  publicKey: string;
  prizeAmount: string;
  place: 1 | 2 | 3;
}

@Injectable()
export class ChainMonitorService implements OnModuleInit {
  private readonly logger = new Logger(ChainMonitorService.name);
  private isRunning = false;

  constructor(
    private readonly tournamentStateService: TournamentStateService,
    private readonly minaClientService: MinaClientService,
    private readonly merkleService: MerkleService,
    @Optional()
    private readonly leaderboardService?: TournamentLeaderboardService
  ) {}

  async onModuleInit() {
    this.logger.log('ChainMonitorService initialized');
  }

  @Cron('0 */2 * * * *')
  async expireStaleSubmittedAwaitingSignature(): Promise<void> {
    const raw = process.env.STALE_SUBMITTED_AWAITING_SIGNATURE_MS;
    const maxAgeMs = raw
      ? parseInt(raw, 10)
      : 30 * 60 * 1000;
    if (!Number.isFinite(maxAgeMs) || maxAgeMs < 60_000) {
      this.logger.warn(
        'STALE_SUBMITTED_AWAITING_SIGNATURE_MS invalid or too small; skipping stale cleanup'
      );
      return;
    }

    try {
      await this.tournamentStateService.expireStaleSubmittedAwaitingSignature(
        maxAgeMs
      );
    } catch (error) {
      this.logger.error(
        'Error expiring stale submitted operations awaiting signature',
        error
      );
    }
  }

  @Cron('*/30 * * * * *')
  async checkPendingTransactions(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;

    try {
      const activeTournaments =
        await this.tournamentStateService.getActiveTournaments();

      for (const tournament of activeTournaments) {
        const submittedOps =
          await this.tournamentStateService.getPendingOperations(
            tournament.tournamentId,
            [OperationStatus.Submitted]
          );

        for (const op of submittedOps) {
          if (op.txHash) {
            await this.checkTransactionStatus(op);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking pending transactions', error);
    } finally {
      this.isRunning = false;
    }
  }

  @Cron('0 * * * * *')
  async checkTournamentPhases(): Promise<void> {
    try {
      const activeTournaments =
        await this.tournamentStateService.getActiveTournaments();

      let currentSlot: number;
      try {
        currentSlot = await this.minaClientService.getCurrentSlot();
      } catch (error) {
        this.logger.warn('Could not fetch current slot, skipping phase check');
        return;
      }

      for (const tournament of activeTournaments) {
        if (
          tournament.verified.status === TournamentStatus.Battle &&
          currentSlot >= tournament.verified.battleEndSlot
        ) {
          this.logger.log(
            `Tournament ${tournament.tournamentId} battle has ended, ready for finalization`
          );
          await this.checkAndTriggerFinalization(tournament.tournamentId);
        }
      }
    } catch (error) {
      this.logger.error('Error checking tournament phases', error);
    }
  }

  private async checkTransactionStatus(
    op: PendingOperationDocument
  ): Promise<void> {
    if (!op.txHash) {
      return;
    }

    try {
      const status = await this.minaClientService.getTransactionStatus(
        op.txHash
      );

      if (status === 'included') {
        this.logger.log(
          `Transaction ${op.txHash} confirmed for operation ${op._id}`
        );
        await this.tournamentStateService.confirmOperation(
          op._id.toString(),
          op.txHash
        );
      } else if (status === 'failed') {
        this.logger.warn(
          `Transaction ${op.txHash} failed for operation ${op._id}`
        );
        await this.tournamentStateService.failOperation(
          op._id.toString(),
          'Transaction failed on-chain'
        );
      }
    } catch (error) {
      this.logger.error(
        `Error checking transaction status for ${op.txHash}`,
        error
      );
    }
  }

  async checkAndTriggerFinalization(tournamentId: string): Promise<void> {
    const existingOp = await this.findExistingPhaseTransitionOp(
      tournamentId,
      OperationType.FinalizeTournament
    );

    if (existingOp) {
      this.logger.debug(
        `FinalizeTournament operation already exists for tournament ${tournamentId}`
      );
      return;
    }

    if (!this.leaderboardService) {
      this.logger.log(
        `Tournament ${tournamentId} is ready for finalization. Leaderboard service not available — waiting for winners data...`
      );
      return;
    }

    const winners =
      await this.leaderboardService.getTopWinners(tournamentId, 3);

    let finalizeWinners: WinnerInfo[];
    if (winners.length === 0) {
      const tournament =
        await this.tournamentStateService.getVerifiedState(tournamentId);
      if (!tournament) {
        this.logger.warn(
          `Tournament ${tournamentId} not found, cannot finalize with admin fallback`
        );
        return;
      }
      const adminPubKey = await this.getAdminPublicKey();
      if (!adminPubKey) {
        this.logger.warn(
          `Tournament ${tournamentId}: no leaderboard winners and admin public key unavailable`
        );
        return;
      }
      const prizePool = tournament.verified.prizePool;
      finalizeWinners = [
        {
          publicKey: adminPubKey,
          prizeAmount: String(prizePool),
          place: 1,
        },
      ];
      this.logger.log(
        `Tournament ${tournamentId}: no matches / no ranked winners; finalizing with admin as sole winner for full prize pool (${prizePool})`
      );
    } else {
      finalizeWinners = winners;
      this.logger.log(
        `Tournament ${tournamentId}: finalizing with ${winners.length} winners from leaderboard`
      );
    }

    await this.triggerFinalization(tournamentId, finalizeWinners);
  }

  async triggerFinalization(
    tournamentId: string,
    winners: WinnerInfo[]
  ): Promise<void> {
    const tournament = await this.tournamentStateService.getVerifiedState(
      tournamentId
    );
    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    if (tournament.verified.status !== TournamentStatus.Battle) {
      throw new Error(
        `Tournament ${tournamentId} is not in Battle phase, cannot finalize`
      );
    }

    this.logger.log(
      `Triggering finalization for tournament ${tournamentId} with ${winners.length} winners`
    );

    const adminPubKey = await this.getAdminPublicKey();
    if (!adminPubKey) {
      throw new Error('Admin public key not available');
    }

    await this.tournamentStateService.addPendingOperation({
      tournamentId,
      type: OperationType.FinalizeTournament,
      playerPubKey: adminPubKey,
      finalizeWinners: winners.map((w) => ({
        publicKey: w.publicKey,
        prizeAmount: w.prizeAmount,
        place: w.place,
      })),
    });

    this.logger.log(
      `Created FinalizeTournament operation for tournament ${tournamentId}`
    );
  }

  private async findExistingPhaseTransitionOp(
    tournamentId: string,
    type: OperationType
  ): Promise<PendingOperationDocument | null> {
    const ops = await this.tournamentStateService.getPendingOperations(
      tournamentId,
      [OperationStatus.Queued, OperationStatus.Proving, OperationStatus.Submitted]
    );

    return ops.find((op) => op.type === type) || null;
  }

  private async getAdminPublicKey(): Promise<string | null> {
    try {
      const contractState =
        await this.minaClientService.fetchContractState();
      if (contractState) {
        return contractState.admin.toBase58();
      }
    } catch (error) {
      this.logger.error('Failed to fetch admin public key', error);
    }

    return process.env.ADMIN_PUBLIC_KEY || null;
  }

  async syncTournamentFromChain(tournamentId: string): Promise<void> {
    this.logger.log(
      `Syncing tournament ${tournamentId} state from chain`
    );

    try {
      const contractState =
        await this.minaClientService.fetchContractState();

      if (contractState) {
        await this.tournamentStateService.updateTournamentsRoot(
          tournamentId,
          contractState.tournamentsRoot.toString()
        );
        this.logger.log(
          `Updated tournaments root for ${tournamentId}`
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync tournament ${tournamentId} from chain`,
        error
      );
    }
  }

  async getChainStatus(): Promise<{
    connected: boolean;
    currentSlot: number | null;
    contractAddress: string | null;
  }> {
    try {
      const currentSlot = await this.minaClientService.getCurrentSlot();
      const contractAddress = this.minaClientService
        .getContractAddress()
        .toBase58();

      return {
        connected: true,
        currentSlot,
        contractAddress,
      };
    } catch {
      return {
        connected: false,
        currentSlot: null,
        contractAddress: null,
      };
    }
  }
}
