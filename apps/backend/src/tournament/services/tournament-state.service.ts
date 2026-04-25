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
  VerifiedState,
} from '../schemas/tournament.schema.js';
import {
  PendingOperation,
  PendingOperationDocument,
  OperationType,
  OperationStatus,
  FinalizeWinnerPayload,
} from '../schemas/pending-operation.schema.js';
import { MerkleService } from './merkle.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { OperationEventsService } from './operation-events.service.js';

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
  title?: string;
  imageUrl?: string;
}

export interface AddPendingOperationDto {
  tournamentId: string;
  type: OperationType;
  playerPubKey: string;
  /** Required for {@link OperationType.FinalizeTournament}. */
  finalizeWinners?: FinalizeWinnerPayload[];
}

@Injectable()
export class TournamentStateService {
  private readonly logger = new Logger(TournamentStateService.name);

  private static readonly PLATFORM_FEE_BASIS_POINTS = 500n; // 5%
  private static readonly BASIS_POINTS_DIVISOR = 10000n;

  private static readonly OPTIMISTIC_RETRY_LIMIT = 5;

  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<TournamentDocument>,
    @InjectModel(PendingOperation.name)
    private readonly pendingOpModel: Model<PendingOperationDocument>,
    private readonly merkleService: MerkleService,
    private readonly redisService: RedisService,
    private readonly operationEventsService: OperationEventsService
  ) {}

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: number }).code === 11000
    );
  }

  private isVersionError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { name?: string }).name === 'VersionError'
    );
  }

  private async retryOnVersionConflict<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<T> {
    let lastErr: unknown;
    for (
      let attempt = 1;
      attempt <= TournamentStateService.OPTIMISTIC_RETRY_LIMIT;
      attempt++
    ) {
      try {
        return await fn();
      } catch (err) {
        if (!this.isVersionError(err)) {
          throw err;
        }
        lastErr = err;
        this.logger.warn(
          `Optimistic concurrency conflict on ${label} (attempt ${attempt}/${TournamentStateService.OPTIMISTIC_RETRY_LIMIT}), retrying`
        );
      }
    }
    throw lastErr;
  }

  private calculatePrizeContribution(ticketPrice: bigint): bigint {
    return (
      ticketPrice -
      (ticketPrice * TournamentStateService.PLATFORM_FEE_BASIS_POINTS) /
        TournamentStateService.BASIS_POINTS_DIVISOR
    );
  }

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

    const registeredPlayers = Array.from(tournament.participants.keys()).filter(
      (key) => tournament.participants.get(key) === true
    );

    const pendingPlayers = pendingBuyTickets.map((op) => op.playerPubKey);

    const ticketPrice = BigInt(tournament.verified.ticketPrice);
    const prizeContributionPerTicket =
      this.calculatePrizeContribution(ticketPrice);

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
      ...(tournament.title !== undefined && tournament.title !== ''
        ? { title: tournament.title }
        : {}),
      ...(tournament.imageUrl !== undefined && tournament.imageUrl !== ''
        ? { imageUrl: tournament.imageUrl }
        : {}),
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
      // The `unique_active_operation` partial index guarantees that only one
      // queued/proving/submitted op per (tournamentId, playerPubKey, type)
      // can exist. A concurrent insert that loses the race surfaces here as
      // a duplicate key error, which we translate to a 409.
      if (this.isDuplicateKeyError(err)) {
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

    // Order matters: apply the verified-state mutation FIRST, then mark the
    // pending op as Confirmed. Both apply functions are idempotent (they
    // short-circuit if the change is already present), so if this process
    // crashes between the two steps the op stays in `Submitted` and the
    // recovery path will re-run the apply (no-op) before flipping the status.
    // The reverse order would risk losing the verified-state update entirely.
    if (op.type === OperationType.BuyTicket) {
      await this.retryOnVersionConflict(
        () => this.applyBuyTicketToVerified(op.tournamentId, op.playerPubKey),
        `applyBuyTicket(${op.tournamentId}, ${op.playerPubKey})`
      );
    }

    if (op.type === OperationType.ClaimPrize) {
      await this.retryOnVersionConflict(
        () => this.applyClaimPrizeToVerified(op.tournamentId, op.playerPubKey),
        `applyClaimPrize(${op.tournamentId}, ${op.playerPubKey})`
      );
    }

    if (op.type === OperationType.AdvanceToBattle) {
      await this.retryOnVersionConflict(
        () => this.applyAdvanceToBattleToVerified(op.tournamentId),
        `applyAdvanceToBattle(${op.tournamentId})`
      );
    }

    if (op.type === OperationType.FinalizeTournament) {
      await this.retryOnVersionConflict(
        () => this.applyFinalizeTournamentToVerified(op),
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

  private async applyBuyTicketToVerified(
    tournamentId: string,
    playerPubKey: string
  ): Promise<void> {
    const tournament = await this.tournamentModel
      .findOne({ tournamentId })
      .exec();

    if (!tournament) {
      throw new NotFoundException(
        `Cannot apply buyTicket: Tournament ${tournamentId} not found`
      );
    }

    if (tournament.participants.get(playerPubKey) === true) {
      this.logger.warn(
        `buyTicket for ${playerPubKey} already applied to tournament ${tournamentId}, skipping`
      );
      return;
    }

    tournament.participants.set(playerPubKey, true);

    const ticketPrice = BigInt(tournament.verified.ticketPrice);
    const prizeContribution = this.calculatePrizeContribution(ticketPrice);

    tournament.verified.prizePool = (
      BigInt(tournament.verified.prizePool) + prizeContribution
    ).toString();
    tournament.verified.participantCount += 1;

    const participantsMap = this.merkleService.buildParticipantsMap(
      tournament.participants
    );
    tournament.verified.participantsRoot = participantsMap.getRoot().toString();

    // `optimisticConcurrency: true` on the schema makes save() include __v in
    // the filter; a concurrent writer that already bumped __v will cause
    // VersionError, which the caller retries.
    await tournament.save();
    this.logger.log(
      `Applied buyTicket for ${playerPubKey} to tournament ${tournamentId}`
    );
  }

  private async applyClaimPrizeToVerified(
    tournamentId: string,
    playerPubKey: string
  ): Promise<void> {
    const tournament = await this.tournamentModel
      .findOne({ tournamentId })
      .exec();

    if (!tournament) {
      throw new NotFoundException(
        `Cannot apply claimPrize: Tournament ${tournamentId} not found`
      );
    }

    const winnerInfo = tournament.winners?.get(playerPubKey);
    if (!winnerInfo) {
      throw new NotFoundException(
        `Cannot apply claimPrize: Player ${playerPubKey} is not a winner`
      );
    }

    if (winnerInfo.claimed) {
      this.logger.warn(
        `claimPrize for ${playerPubKey} already applied to tournament ${tournamentId}, skipping`
      );
      return;
    }

    winnerInfo.claimed = true;
    tournament.winners.set(playerPubKey, winnerInfo);

    const winnersMap = this.merkleService.buildWinnersMap(tournament.winners);
    tournament.verified.winnersRoot = winnersMap.getRoot().toString();

    await tournament.save();
    this.logger.log(
      `Applied claimPrize for ${playerPubKey} in tournament ${tournamentId}`
    );
  }

  private async applyAdvanceToBattleToVerified(
    tournamentId: string
  ): Promise<void> {
    const tournament = await this.tournamentModel
      .findOne({ tournamentId })
      .exec();

    if (!tournament) {
      throw new NotFoundException(
        `Cannot apply advanceToBattle: Tournament ${tournamentId} not found`
      );
    }

    if (tournament.verified.status === TournamentStatus.Battle) {
      this.logger.warn(
        `advanceToBattle for ${tournamentId} already applied, skipping`
      );
      return;
    }

    if (tournament.verified.status !== TournamentStatus.Registration) {
      throw new BadRequestException(
        `Cannot advance to battle from status ${tournament.verified.status}`
      );
    }

    tournament.verified.status = TournamentStatus.Battle;
    await tournament.save();
    this.logger.log(`Applied advanceToBattle for tournament ${tournamentId}`);
  }

  private async applyFinalizeTournamentToVerified(
    op: PendingOperationDocument
  ): Promise<void> {
    const { tournamentId } = op;
    const rows = op.finalizeWinners;
    if (!rows?.length) {
      throw new BadRequestException(
        `Operation ${op._id} is missing finalizeWinners snapshot`
      );
    }

    const tournament = await this.tournamentModel
      .findOne({ tournamentId })
      .exec();

    if (!tournament) {
      throw new NotFoundException(
        `Cannot apply finalizeTournament: Tournament ${tournamentId} not found`
      );
    }

    if (tournament.verified.status === TournamentStatus.Claiming) {
      this.logger.warn(
        `finalizeTournament for ${tournamentId} already applied, skipping`
      );
      return;
    }

    if (tournament.verified.status !== TournamentStatus.Battle) {
      throw new BadRequestException(
        `Cannot finalize from status ${tournament.verified.status}`
      );
    }

    const sorted = [...rows].sort((a, b) => a.place - b.place);
    const winners = new Map<string, { prizeAmount: string; claimed: boolean }>();
    for (const w of sorted) {
      winners.set(w.publicKey, {
        prizeAmount: w.prizeAmount,
        claimed: false,
      });
    }
    tournament.winners = winners;

    const winnersMap = this.merkleService.buildWinnersMap(tournament.winners);
    tournament.verified.winnersRoot = winnersMap.getRoot().toString();
    tournament.verified.status = TournamentStatus.Claiming;

    await tournament.save();
    this.logger.log(`Applied finalizeTournament for tournament ${tournamentId}`);
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
    tournamentsRoot: string,
    display?: { title?: string; imageUrl?: string }
  ): Promise<TournamentDocument> {
    this.validateTournamentConfig(config);

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
      ...(display?.title !== undefined && display.title !== ''
        ? { title: display.title }
        : {}),
      ...(display?.imageUrl !== undefined && display.imageUrl !== ''
        ? { imageUrl: display.imageUrl }
        : {}),
    });

    return tournament.save();
  }

  private validateTournamentConfig(config: {
    ticketPrice: string;
    prize1Percent: number;
    prize2Percent: number;
    prize3Percent: number;
    registrationStartSlot: number;
    battleStartSlot: number;
    battleEndSlot: number;
  }): void {
    try {
      const ticketPrice = BigInt(config.ticketPrice);
      if (ticketPrice <= 0n) {
        throw new BadRequestException('Ticket price must be positive');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Invalid ticket price format');
    }

    const totalPrizePercent =
      config.prize1Percent + config.prize2Percent + config.prize3Percent;
    // 10000 base points = 100%
    if (totalPrizePercent > 10000) {
      throw new BadRequestException(
        `Prize percentages sum to ${totalPrizePercent}%, must not exceed 100%`
      );
    }
    if (
      config.prize1Percent < 0 ||
      config.prize2Percent < 0 ||
      config.prize3Percent < 0
    ) {
      throw new BadRequestException('Prize percentages cannot be negative');
    }

    if (config.registrationStartSlot < 0) {
      throw new BadRequestException(
        'Registration start slot cannot be negative'
      );
    }
    if (config.battleStartSlot <= config.registrationStartSlot) {
      throw new BadRequestException(
        'Battle start slot must be after registration start slot'
      );
    }
    if (config.battleEndSlot <= config.battleStartSlot) {
      throw new BadRequestException(
        'Battle end slot must be after battle start slot'
      );
    }
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
