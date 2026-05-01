import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Sse,
  HttpException,
  HttpStatus,
  Logger,
  MessageEvent,
} from '@nestjs/common';
import { Observable, from, merge } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import {
  TournamentStateService,
  ProofGeneratorService,
  ChainMonitorService,
  MinaClientService,
  OperationEventsService,
  type OperationStreamData,
  TournamentLeaderboardService,
} from './services/index.js';
import { OperationType, OperationStatus } from './schemas/pending-operation.schema.js';
import {
  BuyTicketDto,
  BuyTicketResponseDto,
  ClaimPrizeDto,
  ClaimPrizeResponseDto,
  CreateTournamentDto,
  CreateTournamentResponseDto,
  TournamentResponseDto,
  ParticipantsResponseDto,
  PendingOperationResponseDto,
  ChainStatusResponseDto,
  OperationStreamEventDto,
} from './dto/index.js';
import { TournamentDocument } from './schemas/tournament.schema.js';
import { ITournamentLeaderboardEntry } from '../../../common/types/tournament-matchmaking.types.js';

@Controller('tournament')
export class TournamentController {
  private readonly logger = new Logger(TournamentController.name);

  constructor(
    private readonly tournamentStateService: TournamentStateService,
    private readonly proofGeneratorService: ProofGeneratorService,
    private readonly chainMonitorService: ChainMonitorService,
    private readonly minaClientService: MinaClientService,
    private readonly operationEventsService: OperationEventsService,
    private readonly leaderboardService: TournamentLeaderboardService
  ) {}

  @Get('status')
  async getChainStatus(): Promise<ChainStatusResponseDto> {
    const chainStatus = await this.chainMonitorService.getChainStatus();
    return {
      ...chainStatus,
      proofGeneratorReady: this.proofGeneratorService.isReady(),
    };
  }

  @Post()
  async createTournament(
    @Body() dto: CreateTournamentDto
  ): Promise<CreateTournamentResponseDto> {
    this.logger.log(`Create tournament request: id=${dto.tournamentId}, txHash=${dto.txHash ?? 'none'}`);

    await this.checkTournamentHash(dto.txHash, dto.tournamentsRoot);

    try {
      const displayTitle = dto.title?.trim();
      const displayImageUrl = dto.imageUrl?.trim();
      const displayDescription = dto.description?.trim();
      const displaySponsors = dto.sponsors && dto.sponsors.length > 0 ? dto.sponsors : undefined;

      const tournament = await this.tournamentStateService.createTournament(
        dto.tournamentId,
        {
          ticketPrice: dto.ticketPrice,
          prize1Percent: dto.prize1Percent,
          prize2Percent: dto.prize2Percent,
          prize3Percent: dto.prize3Percent,
          battleStartSlot: dto.battleStartSlot,
          battleEndSlot: dto.battleEndSlot,
        },
        dto.tournamentsRoot,
        {
          ...(displayTitle ? { title: displayTitle } : {}),
          ...(displayImageUrl ? { imageUrl: displayImageUrl } : {}),
          ...(displayDescription ? { description: displayDescription } : {}),
          ...(displaySponsors ? { sponsors: displaySponsors } : {}),
        }
      );

      return {
        tournamentId: tournament.tournamentId,
        status: tournament.verified.status,
        message: `Tournament ${tournament.tournamentId} created successfully`,
      };
    } catch (error) {
      if (
        error instanceof HttpException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create tournament ${dto.tournamentId}`,
        error
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to create tournament',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async checkTournamentHash(
    txHash: string | undefined,
    tournamentsRoot: string
  ): Promise<void> {
    if (txHash) {
      this.logger.log(`Verifying transaction ${txHash} on-chain`);

      const status = await this.minaClientService.getTransactionStatus(txHash);

      if (status === 'failed') {
        throw new HttpException(
          `Transaction ${txHash} failed on-chain`,
          HttpStatus.BAD_REQUEST
        );
      }

      if (status === 'unknown') {
        throw new HttpException(
          `Transaction ${txHash} is not found on the network — it may have been dropped from the mempool`,
          HttpStatus.BAD_REQUEST
        );
      }

      if (status === 'pending') {
        throw new HttpException(
          `Transaction ${txHash} is still pending — wait for confirmation and retry`,
          HttpStatus.CONFLICT
        );
      }

      return;
    }

    this.logger.log(
      'No txHash provided — verifying tournamentsRoot against on-chain state'
    );

    const contractState = await this.minaClientService.fetchContractState();

    if (!contractState) {
      throw new HttpException(
        'Cannot verify tournament: failed to fetch on-chain contract state',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const onChainRoot = contractState.tournamentsRoot.toString();

    if (onChainRoot !== tournamentsRoot) {
      throw new HttpException(
        `tournamentsRoot mismatch: provided ${tournamentsRoot}, on-chain ${onChainRoot}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get()
  async getAllTournaments(): Promise<TournamentResponseDto[]> {
    const tournaments = await this.tournamentStateService.getAllTournaments();
    const results: TournamentResponseDto[] = [];

    for (const tournament of tournaments) {
      const optimistic = await this.tournamentStateService.getOptimisticState(
        tournament.tournamentId
      );
      if (optimistic) {
        results.push(optimistic);
      }
    }

    return results;
  }

  @Get(':id')
  async getTournament(
    @Param('id') tournamentId: string
  ): Promise<TournamentResponseDto> {
    const optimistic =
      await this.tournamentStateService.getOptimisticState(tournamentId);

    if (!optimistic) {
      throw new HttpException(
        `Tournament ${tournamentId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    return optimistic;
  }

  @Get(':id/participants')
  async getParticipants(
    @Param('id') tournamentId: string
  ): Promise<ParticipantsResponseDto> {
    const optimistic =
      await this.tournamentStateService.getOptimisticState(tournamentId);

    if (!optimistic) {
      throw new HttpException(
        `Tournament ${tournamentId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    return {
      tournamentId,
      registered: optimistic.registeredPlayers,
      pending: optimistic.pendingPlayers,
      total: optimistic.participantCount,
    };
  }

  @Get(':id/pending')
  async getPendingOperations(
    @Param('id') tournamentId: string,
    @Query('player') playerPubKey?: string
  ): Promise<PendingOperationResponseDto[]> {
    const tournament =
      await this.tournamentStateService.getVerifiedState(tournamentId);

    if (!tournament) {
      throw new HttpException(
        `Tournament ${tournamentId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    let operations;
    if (playerPubKey) {
      operations =
        await this.tournamentStateService.getPendingOperationsForPlayer(
          tournamentId,
          playerPubKey
        );
    } else {
      operations =
        await this.tournamentStateService.getPendingOperations(tournamentId);
    }

    return operations.map((op) => ({
      id: op._id.toString(),
      tournamentId: op.tournamentId,
      type: op.type,
      playerPubKey: op.playerPubKey,
      status: op.status,
      txHash: op.txHash,
      unsignedTxJson: op.unsignedTxJson,
      error: op.error,
      createdAt: op.createdAt ?? new Date(),
      updatedAt: op.updatedAt ?? new Date(),
    }));
  }

  @Post(':id/buy-ticket')
  async buyTicket(
    @Param('id') tournamentId: string,
    @Body() dto: BuyTicketDto
  ): Promise<BuyTicketResponseDto> {
    this.logger.log(
      `Buy ticket request for tournament ${tournamentId} from ${dto.playerPubKey}`
    );

    return this.queuePlayerOperation(
      tournamentId,
      dto.playerPubKey,
      OperationType.BuyTicket,
      'Battle',
      (tournament) => {
        if (tournament.participants.get(dto.playerPubKey)) {
          throw new HttpException(
            `Player ${dto.playerPubKey} is already registered`,
            HttpStatus.CONFLICT
          );
        }
      }
    );
  }

  @Post(':id/claim-prize')
  async claimPrize(
    @Param('id') tournamentId: string,
    @Body() dto: ClaimPrizeDto
  ): Promise<ClaimPrizeResponseDto> {
    this.logger.log(
      `Claim prize request for tournament ${tournamentId} from ${dto.playerPubKey}`
    );

    return this.queuePlayerOperation(
      tournamentId,
      dto.playerPubKey,
      OperationType.ClaimPrize,
      'Claiming',
      (tournament) => {
        const winnerInfo = tournament.winners?.get(dto.playerPubKey);
        if (!winnerInfo) {
          throw new HttpException(
            `Player ${dto.playerPubKey} is not a winner in tournament ${tournamentId}`,
            HttpStatus.NOT_FOUND
          );
        }
        if (winnerInfo.claimed) {
          throw new HttpException(
            `Player ${dto.playerPubKey} has already claimed their prize`,
            HttpStatus.CONFLICT
          );
        }
      }
    );
  }

  private async queuePlayerOperation(
    tournamentId: string,
    playerPubKey: string,
    operationType: OperationType,
    expectedStatus: string,
    validateEligibility: (tournament: TournamentDocument) => void
  ): Promise<{ operationId: string; status: string; message: string }> {
    const tournament =
      await this.tournamentStateService.getVerifiedState(tournamentId);

    if (!tournament) {
      throw new HttpException(
        `Tournament ${tournamentId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    if (tournament.verified.status !== expectedStatus) {
      throw new HttpException(
        `Tournament ${tournamentId} is not in ${expectedStatus.toLowerCase()} phase`,
        HttpStatus.BAD_REQUEST
      );
    }

    if (
      operationType === OperationType.BuyTicket &&
      expectedStatus === 'Battle'
    ) {
      const currentSlot = await this.minaClientService.getCurrentSlot();
      if (
        currentSlot < tournament.verified.battleStartSlot ||
        currentSlot >= tournament.verified.battleEndSlot
      ) {
        throw new HttpException(
          `Tournament ${tournamentId} only accepts ticket purchases while the battle window is open (slots ${tournament.verified.battleStartSlot}–${tournament.verified.battleEndSlot - 1})`,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    validateEligibility(tournament);

    const existingPending =
      await this.tournamentStateService.getPendingOperationsForPlayer(
        tournamentId,
        playerPubKey
      );

    const hasPending = existingPending.some(
      (op) =>
        op.type === operationType &&
        ['queued', 'proving', 'submitted'].includes(op.status)
    );

    if (hasPending) {
      throw new HttpException(
        `Player ${playerPubKey} already has a pending ${operationType} operation`,
        HttpStatus.CONFLICT
      );
    }

    try {
      const pendingOp = await this.tournamentStateService.addPendingOperation({
        tournamentId,
        type: operationType,
        playerPubKey,
      });

      return {
        operationId: pendingOp._id.toString(),
        status: pendingOp.status,
        message: `${operationType} queued for processing`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to queue ${operationType} for ${playerPubKey}`,
        error
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to queue operation',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/submit-tx')
  async submitTransaction(
    @Param('id') tournamentId: string,
    @Body() body: { operationId: string; signedTxJson: string }
  ): Promise<{ txHash: string }> {
    const tournament =
      await this.tournamentStateService.getVerifiedState(tournamentId);

    if (!tournament) {
      throw new HttpException(
        `Tournament ${tournamentId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    const operation = await this.tournamentStateService.getPendingOperationById(
      body.operationId
    );

    if (!operation) {
      throw new HttpException(
        `Operation ${body.operationId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    if (operation.tournamentId !== tournamentId) {
      throw new HttpException(
        `Operation ${body.operationId} does not belong to tournament ${tournamentId}`,
        HttpStatus.BAD_REQUEST
      );
    }

    if (operation.status !== OperationStatus.Submitted) {
      throw new HttpException(
        `Operation ${body.operationId} is not ready for submission (status: ${operation.status})`,
        HttpStatus.BAD_REQUEST
      );
    }

    if (
      operation.txHash &&
      !operation.txHash.startsWith('pending_')
    ) {
      this.logger.log(
        `Operation ${body.operationId} already broadcast with tx ${operation.txHash}`
      );
      return { txHash: operation.txHash };
    }

    if (body.signedTxJson === undefined || body.signedTxJson === null) {
      throw new HttpException(
        'signedTxJson is required',
        HttpStatus.BAD_REQUEST
      );
    }

    if (typeof body.signedTxJson !== 'string') {
      throw new HttpException(
        'signedTxJson must be a string (Auro signedData: JSON text of the zkApp command)',
        HttpStatus.BAD_REQUEST
      );
    }

    const signedTxJsonStr = body.signedTxJson.trim();
    if (signedTxJsonStr === '' || signedTxJsonStr === '{}') {
      throw new HttpException(
        'signedTxJson must be a non-empty serialized transaction',
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const result = await this.minaClientService.submitTransaction(
        signedTxJsonStr
      );

      this.logger.log(
        `Broadcast operation ${body.operationId} → tx ${result.hash}`
      );

      await this.tournamentStateService.updateOperationStatus(
        body.operationId,
        OperationStatus.Submitted,
        { txHash: result.hash }
      );

      return { txHash: result.hash };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to broadcast transaction';
      this.logger.error(
        `Broadcast failed for operation ${body.operationId}: ${message}`,
        error instanceof Error ? error.stack : undefined
      );

      const marked = await this.tournamentStateService.failOperationIfAwaitingBroadcast(
        body.operationId,
        `broadcast_failed: ${message}`
      );
      if (marked) {
        this.logger.log(
          `Marked operation ${body.operationId} as failed after broadcast error`
        );
      }

      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post(':id/operation/:opId/abandon')
  async abandonOperation(
    @Param('id') tournamentId: string,
    @Param('opId') operationId: string,
    @Body() body: { playerPubKey: string }
  ): Promise<{ ok: true; status: string }> {
    if (
      body.playerPubKey === undefined ||
      body.playerPubKey === null ||
      typeof body.playerPubKey !== 'string' ||
      body.playerPubKey.trim() === ''
    ) {
      throw new HttpException('playerPubKey is required', HttpStatus.BAD_REQUEST);
    }

    const result = await this.tournamentStateService.abandonPlayerOperation(
      tournamentId,
      operationId,
      body.playerPubKey.trim()
    );

    if (!result.ok) {
      if (result.reason === 'not_found') {
        throw new HttpException(
          `Operation ${operationId} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      if (result.reason === 'wrong_tournament') {
        throw new HttpException(
          `Operation ${operationId} does not belong to tournament ${tournamentId}`,
          HttpStatus.BAD_REQUEST
        );
      }
      if (result.reason === 'wrong_player') {
        throw new HttpException(
          'playerPubKey does not match this operation',
          HttpStatus.FORBIDDEN
        );
      }
      if (result.reason === 'wrong_type') {
        throw new HttpException(
          'Only buyTicket or claimPrize operations can be abandoned',
          HttpStatus.BAD_REQUEST
        );
      }
      if (result.reason === 'not_abandonable_state') {
        throw new HttpException(
          `Operation cannot be abandoned in status ${result.status}`,
          HttpStatus.CONFLICT
        );
      }
      if (result.reason === 'already_broadcast') {
        throw new HttpException(
          'Operation already has a broadcast transaction',
          HttpStatus.CONFLICT
        );
      }
      if (result.reason === 'already_terminal') {
        throw new HttpException(
          `Operation is already ${result.status}`,
          HttpStatus.CONFLICT
        );
      }

      // Exhaustive guard: every reason must be handled above.
      throw new HttpException(
        `Unexpected abandon result: ${(result as { reason: string }).reason}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return { ok: true, status: OperationStatus.Failed };
  }

  @Get(':id/operation/:opId')
  async getOperation(
    @Param('id') tournamentId: string,
    @Param('opId') operationId: string
  ): Promise<PendingOperationResponseDto> {
    const operation =
      await this.tournamentStateService.getPendingOperationById(operationId);

    if (!operation || operation.tournamentId !== tournamentId) {
      throw new HttpException(
        `Operation ${operationId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    return {
      id: operation._id.toString(),
      tournamentId: operation.tournamentId,
      type: operation.type,
      playerPubKey: operation.playerPubKey,
      status: operation.status,
      txHash: operation.txHash,
      unsignedTxJson: operation.unsignedTxJson,
      error: operation.error,
      createdAt: operation.createdAt ?? new Date(),
      updatedAt: operation.updatedAt ?? new Date(),
    };
  }

  @Sse(':id/operation/:opId/stream')
  streamOperation(
    @Param('id') tournamentId: string,
    @Param('opId') operationId: string
  ): Observable<MessageEvent> {
    this.logger.log(
      `SSE stream opened for operation ${operationId} in tournament ${tournamentId}`
    );

    const initialState$ = from(
      this.tournamentStateService.getPendingOperationById(operationId)
    ).pipe(
      map((operation): MessageEvent => {
        if (!operation || operation.tournamentId !== tournamentId) {
          throw new HttpException(
            `Operation ${operationId} not found`,
            HttpStatus.NOT_FOUND
          );
        }

        const data: OperationStreamEventDto = {
          status: operation.status,
          unsignedTxJson: operation.unsignedTxJson,
          txHash: operation.txHash,
          error: operation.error,
          updatedAt: (operation.updatedAt ?? new Date()).toISOString(),
        };

        return { data };
      })
    );

    const liveUpdates$ = this.operationEventsService
      .getOperationStream(operationId)
      .pipe(
        map((data): MessageEvent => ({ data })),
        takeWhile((event) => {
          const status = (event.data as OperationStreamData).status as OperationStatus;
          return !this.operationEventsService.isTerminalStatus(status);
        }, true)
      );

    return merge(initialState$, liveUpdates$);
  }

  @Get(':id/leaderboard')
  async getLeaderboard(
    @Param('id') tournamentId: string
  ): Promise<ITournamentLeaderboardEntry[]> {
    this.logger.log(`Getting leaderboard for tournament ${tournamentId}`);

    const tournament =
      await this.tournamentStateService.getVerifiedState(tournamentId);
    if (!tournament) {
      throw new HttpException('Tournament not found', HttpStatus.NOT_FOUND);
    }

    return this.leaderboardService.getLeaderboard(tournamentId);
  }

  @Get(':id/leaderboard/match-count')
  async getMatchCount(
    @Param('id') tournamentId: string
  ): Promise<{ tournamentId: string; matchCount: number }> {
    const count = await this.leaderboardService.getMatchCount(tournamentId);
    return { tournamentId, matchCount: count };
  }
}
