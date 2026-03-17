import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
  VerifiedState,
} from '../schemas/tournament.schema.js';
import {
  PendingOperation,
  PendingOperationDocument,
  OperationType,
  OperationStatus,
} from '../schemas/pending-operation.schema.js';
import { MerkleService } from './merkle.service.js';
import { RedisService } from '../../redis/redis.service.js';

export interface OptimisticView {
  tournamentId: string;
  status: TournamentStatus;
  registrationStartSlot: number;
  battleStartSlot: number;
  battleEndSlot: number;
  ticketPrice: string;
  prize1Percent: number;
  prize2Percent: number;
  prize3Percent: number;
  prizePool: string;
  participantCount: number;
  registeredPlayers: string[];
  pendingPlayers: string[];
}

export interface AddPendingOperationDto {
  tournamentId: string;
  type: OperationType;
  playerPubKey: string;
}

@Injectable()
export class TournamentStateService {
  private readonly logger = new Logger(TournamentStateService.name);

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    @InjectModel(PendingOperation.name)
    private readonly pendingOpModel: Model<PendingOperationDocument>,
    private readonly merkleService: MerkleService,
    private readonly redisService: RedisService
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
        'verified.status': { $in: [TournamentStatus.Registration, TournamentStatus.Battle] },
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

    const pendingOps = await this.getPendingOperations(
      tournamentId,
      [OperationStatus.Queued, OperationStatus.Proving, OperationStatus.Submitted]
    );

    const pendingBuyTickets = pendingOps.filter(
      (op) => op.type === OperationType.BuyTicket
    );

    const registeredPlayers = Array.from(tournament.participants.keys()).filter(
      (key) => tournament.participants.get(key) === true
    );

    const pendingPlayers = pendingBuyTickets.map((op) => op.playerPubKey);

    const ticketPrice = BigInt(tournament.verified.ticketPrice);
    const platformFeePercent = 500;
    const prizeContributionPerTicket =
      ticketPrice - (ticketPrice * BigInt(platformFeePercent)) / BigInt(10000);

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
    const existingPending = await this.pendingOpModel.findOne({
      tournamentId: dto.tournamentId,
      playerPubKey: dto.playerPubKey,
      type: dto.type,
      status: { $in: [OperationStatus.Queued, OperationStatus.Proving, OperationStatus.Submitted] },
    });

    if (existingPending) {
      throw new Error(
        `Player ${dto.playerPubKey} already has a pending ${dto.type} operation`
      );
    }

    const tournament = await this.getVerifiedState(dto.tournamentId);
    if (!tournament) {
      throw new NotFoundException(`Tournament ${dto.tournamentId} not found`);
    }

    if (dto.type === OperationType.BuyTicket) {
      if (tournament.participants.get(dto.playerPubKey)) {
        throw new Error(`Player ${dto.playerPubKey} is already registered`);
      }
    }

    const pendingOp = new this.pendingOpModel({
      tournamentId: dto.tournamentId,
      type: dto.type,
      playerPubKey: dto.playerPubKey,
      status: OperationStatus.Queued,
      retryCount: 0,
    });

    const saved = await pendingOp.save();
    this.logger.log(
      `Created pending operation ${saved._id} for ${dto.type} on tournament ${dto.tournamentId}`
    );

    await this.notifyProofQueue(dto.tournamentId);

    return saved;
  }

  async updateOperationStatus(
    opId: string | Types.ObjectId,
    status: OperationStatus,
    updates?: Partial<{ txHash: string; error: string; retryCount: number }>
  ): Promise<PendingOperationDocument | null> {
    const updateData: Record<string, unknown> = { status, ...updates };
    if (status === OperationStatus.Confirmed) {
      updateData.confirmedAt = new Date();
    }

    return this.pendingOpModel
      .findByIdAndUpdate(opId, updateData, { new: true })
      .exec();
  }

  async confirmOperation(
    opId: string,
    txHash: string
  ): Promise<void> {
    const op = await this.getPendingOperationById(opId);
    if (!op) {
      throw new NotFoundException(`Operation ${opId} not found`);
    }

    await this.updateOperationStatus(opId, OperationStatus.Confirmed, { txHash });

    if (op.type === OperationType.BuyTicket) {
      await this.applyBuyTicketToVerified(op.tournamentId, op.playerPubKey);
    }

    this.logger.log(
      `Confirmed operation ${opId} with tx ${txHash}`
    );
  }

  async failOperation(
    opId: string,
    error: string
  ): Promise<void> {
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

  private async applyBuyTicketToVerified(
    tournamentId: string,
    playerPubKey: string
  ): Promise<void> {
    const tournament = await this.getVerifiedState(tournamentId);
    if (!tournament) {
      this.logger.error(
        `Cannot apply buyTicket: Tournament ${tournamentId} not found`
      );
      return;
    }

    tournament.participants.set(playerPubKey, true);

    const ticketPrice = BigInt(tournament.verified.ticketPrice);
    const platformFeePercent = 500;
    const prizeContribution =
      ticketPrice - (ticketPrice * BigInt(platformFeePercent)) / BigInt(10000);

    tournament.verified.prizePool = (
      BigInt(tournament.verified.prizePool) + prizeContribution
    ).toString();
    tournament.verified.participantCount += 1;

    const participantsMap = this.merkleService.buildParticipantsMap(
      tournament.participants
    );
    tournament.verified.participantsRoot = participantsMap.getRoot().toString();

    await tournament.save();
    this.logger.log(
      `Applied buyTicket for ${playerPubKey} to tournament ${tournamentId}`
    );
  }

  async createTournament(
    tournamentId: string,
    config: {
      ticketPrice: string;
      prize1Percent: number;
      prize2Percent: number;
      prize3Percent: number;
      registrationStartSlot: number;
      battleStartSlot: number;
      battleEndSlot: number;
    },
    tournamentsRoot: string
  ): Promise<TournamentDocument> {
    const emptyRoot = '544619463418997333856881110951498501703454628897449993518845662251180546746';

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
      tournamentsRoot,
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
