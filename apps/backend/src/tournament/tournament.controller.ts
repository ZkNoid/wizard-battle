import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { TournamentStateService } from './services/tournament-state.service.js';
import { ProofGeneratorService } from './services/proof-generator.service.js';
import { ChainMonitorService } from './services/chain-monitor.service.js';
import { OperationType } from './schemas/pending-operation.schema.js';
import {
  BuyTicketDto,
  BuyTicketResponseDto,
  TournamentResponseDto,
  ParticipantsResponseDto,
  PendingOperationResponseDto,
  ChainStatusResponseDto,
} from './dto/index.js';

@Controller('tournament')
export class TournamentController {
  private readonly logger = new Logger(TournamentController.name);

  constructor(
    private readonly tournamentStateService: TournamentStateService,
    private readonly proofGeneratorService: ProofGeneratorService,
    private readonly chainMonitorService: ChainMonitorService
  ) {}

  @Get('status')
  async getChainStatus(): Promise<ChainStatusResponseDto> {
    const chainStatus = await this.chainMonitorService.getChainStatus();
    return {
      ...chainStatus,
      proofGeneratorReady: this.proofGeneratorService.isReady(),
    };
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

    const tournament =
      await this.tournamentStateService.getVerifiedState(tournamentId);

    if (!tournament) {
      throw new HttpException(
        `Tournament ${tournamentId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    if (tournament.verified.status !== 'Registration') {
      throw new HttpException(
        `Tournament ${tournamentId} is not in registration phase`,
        HttpStatus.BAD_REQUEST
      );
    }

    if (tournament.participants.get(dto.playerPubKey)) {
      throw new HttpException(
        `Player ${dto.playerPubKey} is already registered`,
        HttpStatus.CONFLICT
      );
    }

    const existingPending =
      await this.tournamentStateService.getPendingOperationsForPlayer(
        tournamentId,
        dto.playerPubKey
      );

    const hasPendingBuyTicket = existingPending.some(
      (op) =>
        op.type === OperationType.BuyTicket &&
        ['queued', 'proving', 'submitted'].includes(op.status)
    );

    if (hasPendingBuyTicket) {
      throw new HttpException(
        `Player ${dto.playerPubKey} already has a pending ticket purchase`,
        HttpStatus.CONFLICT
      );
    }

    try {
      const pendingOp = await this.tournamentStateService.addPendingOperation({
        tournamentId,
        type: OperationType.BuyTicket,
        playerPubKey: dto.playerPubKey,
      });

      return {
        operationId: pendingOp._id.toString(),
        status: pendingOp.status,
        message: 'Ticket purchase queued for processing',
      };
    } catch (error) {
      this.logger.error(
        `Failed to queue buy ticket for ${dto.playerPubKey}`,
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

    if (operation.status !== 'submitted') {
      throw new HttpException(
        `Operation ${body.operationId} is not ready for submission (status: ${operation.status})`,
        HttpStatus.BAD_REQUEST
      );
    }

    this.logger.log(
      `Transaction submission placeholder for operation ${body.operationId}`
    );

    const placeholderTxHash = `pending_${body.operationId}`;

    await this.tournamentStateService.updateOperationStatus(
      body.operationId,
      'submitted' as any,
      { txHash: placeholderTxHash }
    );

    return { txHash: placeholderTxHash };
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
      error: operation.error,
      createdAt: operation.createdAt ?? new Date(),
      updatedAt: operation.updatedAt ?? new Date(),
    };
  }
}
