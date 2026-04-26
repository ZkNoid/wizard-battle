import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
} from '../../schemas/tournament.schema.js';
import {
  PendingOperation,
  PendingOperationDocument,
  OperationType,
  OperationStatus,
} from '../../schemas/pending-operation.schema.js';
import { RedisService } from '../../../redis/redis.service.js';
import { OperationEventsService } from '../events/operation-events.service.js';
import { MerkleService } from '../merkle/merkle.service.js';
import { TournamentVerifiedMutationsService } from './tournament-verified-mutations.service.js';
import { validateCreateTournamentConfig } from './tournament-config.validator.js';
import { optionalTournamentDisplayFields } from './tournament-display.util.js';
import { calculatePrizeContribution } from './tournament-prize.util.js';
import {
  isDuplicateKeyError,
  retryOnVersionConflict,
} from './tournament-mongoose.util.js';
import type {
  OptimisticView,
  AddPendingOperationDto,
  CreateTournamentConfig,
} from './tournament-state.types.js';

export type {
  OptimisticView,
  AddPendingOperationDto,
  CreateTournamentConfig,
} from './tournament-state.types.js';

@Injectable()
export class TournamentStateService {
  private readonly logger = new Logger(TournamentStateService.name);

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    @InjectModel(PendingOperation.name)
    private readonly pendingOpModel: Model<PendingOperationDocument>,
    private readonly merkleService: MerkleService,
    private readonly redisService: RedisService,
    private readonly operationEventsService: OperationEventsService,
    private readonly verifiedMutations: TournamentVerifiedMutationsService
  ) {}

  async getVerifiedState(
    tournamentId: string
  ): Promise<TournamentDocument | null> {
    return this.tournamentModel.findOne({ tournamentId }).exec();
  }

  async getAllTournaments(): Promise<TournamentDocument[]> {
    return this.tournamentModel.find().exec();
  }

  async getActiveTournaments(): Promise<TournamentDocument[]> {
    return this.tournamentModel
      .find({
        'verified.status': {
          $in: [
            TournamentStatus.Registration,
            TournamentStatus.Battle,
            TournamentStatus.Claiming,
          ],
        },
      })
      .exec();
  }

  async getOptimisticState(
    tournamentId: string
  ): Promise<OptimisticView | null> {
    const tournament = await this.getVerifiedState(tournamentId);
    if (!tournament) {
      return null;
    }

    const pendingOps = await this.getPendingOperations(tournamentId, [
      OperationStatus.Queued,
      OperationStatus.Proving,
      OperationStatus.Submitted,
    ]);

    const pendingBuyTickets = pendingOps.filter(
      (op) => op.type === OperationType.BuyTicket
    );

    const registeredPlayers = Array.from(
      tournament.participants.keys()
    ).filter((key) => tournament.participants.get(key) === true);

    const pendingPlayers = pendingBuyTickets.map((op) => op.playerPubKey);

    const ticketPrice = BigInt(tournament.verified.ticketPrice);
    const prizeContributionPerTicket =
      calculatePrizeContribution(ticketPrice);

    const optimisticPrizePool =
      BigInt(tournament.verified.prizePool) +
      prizeContributionPerTicket * BigInt(pendingBuyTickets.length);

    return {
      tournamentId: tournament.tournamentId,
      status: tournament.verified.status,
      registrationStartSlot: tournament.verified.registrationStartSlot,
      battleStartSlot: tournament.verified.battleStartSlot,
      battleEndSlot: tournament.verified.battleEndSlot,
      ticketPrice: tournament.verified.ticketPrice,
      prize1Percent: tournament.verified.prize1Percent,
      prize2Percent: tournament.verified.prize2Percent,
      prize3Percent: tournament.verified.prize3Percent,
      prizePool: optimisticPrizePool.toString(),
      participantCount:
        tournament.verified.participantCount + pendingBuyTickets.length,
      registeredPlayers,
      pendingPlayers,
      ...optionalTournamentDisplayFields(
        tournament.title,
        tournament.imageUrl
      ),
    };
  }

  async getPendingOperations(
    tournamentId: string,
    statuses?: OperationStatus[]
  ): Promise<PendingOperationDocument[]> {
    const query: Record<string, unknown> = { tournamentId };
    if (statuses && statuses.length > 0) {
      query.status = { $in: statuses };
    }
    return this.pendingOpModel.find(query).sort({ createdAt: 1 }).exec();
  }

  async getPendingOperationById(
    opId: string
  ): Promise<PendingOperationDocument | null> {
    return this.pendingOpModel.findById(opId).exec();
  }

  async getPendingOperationsForPlayer(
    tournamentId: string,
    playerPubKey: string
  ): Promise<PendingOperationDocument[]> {
    return this.pendingOpModel
      .find({ tournamentId, playerPubKey })
      .sort({ createdAt: -1 })
      .exec();
  }

  async addPendingOperation(
    dto: AddPendingOperationDto
  ): Promise<PendingOperationDocument> {
    const tournament = await this.getVerifiedState(dto.tournamentId);
    if (!tournament) {
      throw new NotFoundException(`Tournament ${dto.tournamentId} not found`);
    }

    if (dto.type === OperationType.BuyTicket) {
      if (tournament.participants.get(dto.playerPubKey)) {
        throw new ConflictException(
          `Player ${dto.playerPubKey} is already registered`
        );
      }
    }

    if (dto.type === OperationType.ClaimPrize) {
      const winnerInfo = tournament.winners?.get(dto.playerPubKey);
      if (!winnerInfo) {
        throw new NotFoundException(
          `Player ${dto.playerPubKey} is not a winner in tournament ${dto.tournamentId}`
        );
      }
      if (winnerInfo.claimed) {
        throw new ConflictException(
          `Player ${dto.playerPubKey} has already claimed their prize`
        );
      }
    }

    if (dto.type === OperationType.FinalizeTournament) {
      if (tournament.verified.status !== TournamentStatus.Battle) {
        throw new BadRequestException(
          `Tournament ${dto.tournamentId} must be in Battle phase to finalize (status: ${tournament.verified.status})`
        );
      }
      if (!dto.finalizeWinners?.length) {
        throw new BadRequestException(
          'finalizeWinners is required for FinalizeTournament operations'
        );
      }
    }

    let saved: PendingOperationDocument;
    try {
      saved = await this.pendingOpModel.create({
        tournamentId: dto.tournamentId,
        type: dto.type,
        playerPubKey: dto.playerPubKey,
        status: OperationStatus.Queued,
        retryCount: 0,
        ...(dto.type === OperationType.FinalizeTournament && dto.finalizeWinners
          ? { finalizeWinners: dto.finalizeWinners }
          : {}),
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          `Player ${dto.playerPubKey} already has a pending ${dto.type} operation`
        );
      }
      throw err;
    }

    this.logger.log(
      `Created pending operation ${saved._id} for ${dto.type} on tournament ${dto.tournamentId}`
    );

    await this.notifyProofQueue(dto.tournamentId);

    return saved;
  }

  async updateOperationStatus(
    opId: string | Types.ObjectId,
    status: OperationStatus,
    updates?: Partial<{
      txHash: string;
      error: string;
      retryCount: number;
      unsignedTxJson: string;
    }>
  ): Promise<PendingOperationDocument | null> {
    const updateData: Record<string, unknown> = { status, ...updates };
    if (status === OperationStatus.Confirmed) {
      updateData.confirmedAt = new Date();
    }

    const updated = await this.pendingOpModel
      .findByIdAndUpdate(opId, updateData, { new: true })
      .exec();

    if (updated) {
      this.operationEventsService.emit({
        operationId: updated._id.toString(),
        tournamentId: updated.tournamentId,
        status: updated.status,
        unsignedTxJson: updated.unsignedTxJson,
        txHash: updated.txHash,
        error: updated.error,
        updatedAt: updated.updatedAt,
      });
    }

    return updated;
  }

  async confirmOperation(opId: string, txHash: string): Promise<void> {
    const op = await this.getPendingOperationById(opId);
    if (!op) {
      throw new NotFoundException(`Operation ${opId} not found`);
    }

    const retry = (fn: () => Promise<void>, label: string) =>
      retryOnVersionConflict(fn, label, (m) => this.logger.warn(m));

    if (op.type === OperationType.BuyTicket) {
      await retry(
        () =>
          this.verifiedMutations.applyBuyTicketToVerified(
            op.tournamentId,
            op.playerPubKey
          ),
        `applyBuyTicket(${op.tournamentId}, ${op.playerPubKey})`
      );
    }

    if (op.type === OperationType.ClaimPrize) {
      await retry(
        () =>
          this.verifiedMutations.applyClaimPrizeToVerified(
            op.tournamentId,
            op.playerPubKey
          ),
        `applyClaimPrize(${op.tournamentId}, ${op.playerPubKey})`
      );
    }

    if (op.type === OperationType.AdvanceToBattle) {
      await retry(
        () =>
          this.verifiedMutations.applyAdvanceToBattleToVerified(op.tournamentId),
        `applyAdvanceToBattle(${op.tournamentId})`
      );
    }

    if (op.type === OperationType.FinalizeTournament) {
      await retry(
        () => this.verifiedMutations.applyFinalizeTournamentToVerified(op),
        `applyFinalizeTournament(${op.tournamentId})`
      );
    }

    await this.updateOperationStatus(opId, OperationStatus.Confirmed, {
      txHash,
    });

    this.logger.log(`Confirmed operation ${opId} with tx ${txHash}`);
  }

  async failOperation(opId: string, error: string): Promise<void> {
    const op = await this.getPendingOperationById(opId);
    if (!op) {
      throw new NotFoundException(`Operation ${opId} not found`);
    }

    const maxRetries = parseInt(process.env.PROOF_RETRY_MAX || '3', 10);

    if (op.retryCount < maxRetries) {
      await this.updateOperationStatus(opId, OperationStatus.Queued, {
        error,
        retryCount: op.retryCount + 1,
      });
      this.logger.warn(
        `Operation ${opId} failed, retrying (${op.retryCount + 1}/${maxRetries}): ${error}`
      );
      await this.notifyProofQueue(op.tournamentId);
    } else {
      await this.updateOperationStatus(opId, OperationStatus.Failed, { error });
      this.logger.error(
        `Operation ${opId} permanently failed after ${maxRetries} retries: ${error}`
      );
    }
  }

  async createTournament(
    tournamentId: string,
    config: CreateTournamentConfig,
    tournamentsRoot: string,
    display?: { title?: string; imageUrl?: string }
  ): Promise<TournamentDocument> {
    validateCreateTournamentConfig(config);

    const existingTournament = await this.tournamentModel
      .findOne({ tournamentId })
      .exec();
    if (existingTournament) {
      throw new ConflictException(
        `Tournament with ID ${tournamentId} already exists`
      );
    }

    const emptyRoot = this.merkleService.getEmptyRoot();

    const tournament = new this.tournamentModel({
      tournamentId,
      verified: {
        status: TournamentStatus.Registration,
        registrationStartSlot: config.registrationStartSlot,
        battleStartSlot: config.battleStartSlot,
        battleEndSlot: config.battleEndSlot,
        ticketPrice: config.ticketPrice,
        prize1Percent: config.prize1Percent,
        prize2Percent: config.prize2Percent,
        prize3Percent: config.prize3Percent,
        prizePool: '0',
        participantCount: 0,
        participantsRoot: emptyRoot,
        winnersRoot: emptyRoot,
        lastVerifiedBlock: 0,
      },
      participants: new Map(),
      winners: new Map(),
      tournamentsRoot,
      ...optionalTournamentDisplayFields(display?.title, display?.imageUrl),
    });

    return tournament.save();
  }

  async updateTournamentStatus(
    tournamentId: string,
    status: TournamentStatus
  ): Promise<void> {
    await this.tournamentModel.updateOne(
      { tournamentId },
      { 'verified.status': status }
    );
    this.logger.log(`Updated tournament ${tournamentId} status to ${status}`);
  }

  async updateTournamentsRoot(
    tournamentId: string,
    newRoot: string
  ): Promise<void> {
    await this.tournamentModel.updateOne(
      { tournamentId },
      { tournamentsRoot: newRoot }
    );
  }

  private async notifyProofQueue(tournamentId: string): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.publish('proof-queue', JSON.stringify({ tournamentId }));
    this.logger.debug(`Notified proof queue for tournament ${tournamentId}`);
  }
}
