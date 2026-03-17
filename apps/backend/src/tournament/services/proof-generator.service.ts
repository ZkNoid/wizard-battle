import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Mina,
  PublicKey,
  Field,
  UInt64,
  UInt32,
  PrivateKey,
  AccountUpdate,
  MerkleMap,
} from 'o1js';
import {
  TournamentManager,
  TournamentLeaf,
  TournamentStatus as ContractTournamentStatus,
} from '../../../../mina-contracts/src/TournamentManager.js';
import { RedisService } from '../../redis/redis.service.js';
import { TournamentStateService } from './tournament-state.service.js';
import { MerkleService } from './merkle.service.js';
import { MinaClientService } from './mina-client.service.js';
import {
  PendingOperationDocument,
  OperationStatus,
  OperationType,
} from '../schemas/pending-operation.schema.js';
import { TournamentDocument } from '../schemas/tournament.schema.js';

@Injectable()
export class ProofGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(ProofGeneratorService.name);
  private isCompiled = false;
  private isCompiling = false;
  private processingTournaments = new Set<string>();

  constructor(
    private readonly redisService: RedisService,
    private readonly tournamentStateService: TournamentStateService,
    private readonly merkleService: MerkleService,
    private readonly minaClientService: MinaClientService
  ) {}

  async onModuleInit() {
    this.subscribeToProofQueue();
    this.scheduleCompilation();
  }

  private async scheduleCompilation(): Promise<void> {
    setTimeout(() => {
      this.compileContract().catch((err) => {
        this.logger.error('Failed to compile contract on init', err);
      });
    }, 5000);
  }

  private async subscribeToProofQueue(): Promise<void> {
    const redis = this.redisService.getClient();
    const subscriber = redis.duplicate();
    await subscriber.connect();

    await subscriber.subscribe('proof-queue', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.tournamentId) {
          this.triggerQueueProcessing(data.tournamentId);
        }
      } catch (err) {
        this.logger.error('Failed to parse proof-queue message', err);
      }
    });

    this.logger.log('Subscribed to proof-queue');
  }

  private triggerQueueProcessing(tournamentId: string): void {
    if (this.processingTournaments.has(tournamentId)) {
      this.logger.debug(
        `Already processing tournament ${tournamentId}, skipping`
      );
      return;
    }

    this.processQueue(tournamentId).catch((err) => {
      this.logger.error(
        `Error processing queue for tournament ${tournamentId}`,
        err
      );
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processAllQueues(): Promise<void> {
    if (!this.isCompiled) {
      this.logger.debug('Contract not compiled yet, skipping queue processing');
      return;
    }

    const activeTournaments =
      await this.tournamentStateService.getActiveTournaments();

    for (const tournament of activeTournaments) {
      this.triggerQueueProcessing(tournament.tournamentId);
    }
  }

  async compileContract(): Promise<void> {
    if (this.isCompiled || this.isCompiling) {
      return;
    }

    this.isCompiling = true;
    this.logger.log('Starting TournamentManager compilation...');

    try {
      const startTime = Date.now();
      await TournamentManager.compile();
      const elapsed = Date.now() - startTime;

      this.isCompiled = true;
      this.logger.log(
        `TournamentManager compiled successfully in ${elapsed}ms`
      );
    } catch (error) {
      this.logger.error('Failed to compile TournamentManager', error);
      throw error;
    } finally {
      this.isCompiling = false;
    }
  }

  async processQueue(tournamentId: string): Promise<void> {
    if (!this.isCompiled) {
      this.logger.warn(
        'Contract not compiled, cannot process queue'
      );
      return;
    }

    const redis = this.redisService.getClient();
    const lockKey = `tournament:${tournamentId}:proof-lock`;
    const lockTtlSeconds = 300;

    const acquired = await redis.set(lockKey, '1', {
      EX: lockTtlSeconds,
      NX: true,
    });

    if (!acquired) {
      this.logger.debug(
        `Could not acquire lock for tournament ${tournamentId}`
      );
      return;
    }

    this.processingTournaments.add(tournamentId);

    try {
      const pendingOps = await this.tournamentStateService.getPendingOperations(
        tournamentId,
        [OperationStatus.Queued]
      );

      this.logger.log(
        `Processing ${pendingOps.length} pending operations for tournament ${tournamentId}`
      );

      for (const op of pendingOps) {
        await this.processOperation(op);
      }
    } finally {
      await redis.del(lockKey);
      this.processingTournaments.delete(tournamentId);
    }
  }

  private async processOperation(
    op: PendingOperationDocument
  ): Promise<void> {
    this.logger.log(
      `Processing operation ${op._id} (${op.type}) for tournament ${op.tournamentId}`
    );

    await this.tournamentStateService.updateOperationStatus(
      op._id,
      OperationStatus.Proving
    );

    try {
      switch (op.type) {
        case OperationType.BuyTicket:
          await this.processBuyTicket(op);
          break;
        case OperationType.AdvanceToBattle:
          await this.processAdvanceToBattle(op);
          break;
        case OperationType.FinalizeTournament:
          await this.processFinalizeTournament(op);
          break;
        default:
          throw new Error(`Unknown operation type: ${op.type}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Operation ${op._id} failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      );
      await this.tournamentStateService.failOperation(
        op._id.toString(),
        errorMessage
      );
    }
  }

  private async processBuyTicket(
    op: PendingOperationDocument
  ): Promise<void> {
    const tournament = await this.tournamentStateService.getVerifiedState(
      op.tournamentId
    );
    if (!tournament) {
      throw new Error(`Tournament ${op.tournamentId} not found`);
    }

    const allTournaments = await this.tournamentStateService.getAllTournaments();
    const tournamentsMap = this.merkleService.buildTournamentsMap(allTournaments);
    const participantsMap = this.merkleService.buildParticipantsMap(
      tournament.participants
    );

    if (!this.merkleService.verifyParticipantNotRegistered(participantsMap, op.playerPubKey)) {
      throw new Error(`Player ${op.playerPubKey} is already registered`);
    }

    const { tournamentWitness } = this.merkleService.getTournamentWitness(
      tournamentsMap,
      op.tournamentId
    );

    const { witness: participantWitness } =
      this.merkleService.computeNewParticipantsRoot(
        this.merkleService.buildParticipantsMap(tournament.participants),
        op.playerPubKey
      );

    const currentTournamentLeaf = this.buildTournamentLeaf(tournament);

    const contractAddress = this.minaClientService.getContractAddress();
    const contract = new TournamentManager(contractAddress);

    const playerPubKey = PublicKey.fromBase58(op.playerPubKey);

    this.logger.log(`Generating proof for buyTicket operation ${op._id}`);

    const tx = await Mina.transaction(playerPubKey, async () => {
      await contract.buyTicket(
        Field(op.tournamentId),
        currentTournamentLeaf,
        tournamentWitness,
        participantWitness
      );
    });

    await tx.prove();

    this.logger.log(`Proof generated for operation ${op._id}`);

    await this.tournamentStateService.updateOperationStatus(
      op._id,
      OperationStatus.Submitted
    );

    this.logger.log(
      `Operation ${op._id} proof generated, awaiting frontend signature and submission`
    );
  }

  private async processAdvanceToBattle(
    op: PendingOperationDocument
  ): Promise<void> {
    const tournament = await this.tournamentStateService.getVerifiedState(
      op.tournamentId
    );
    if (!tournament) {
      throw new Error(`Tournament ${op.tournamentId} not found`);
    }

    const allTournaments = await this.tournamentStateService.getAllTournaments();
    const tournamentsMap = this.merkleService.buildTournamentsMap(allTournaments);

    const { tournamentWitness } = this.merkleService.getTournamentWitness(
      tournamentsMap,
      op.tournamentId
    );

    const currentTournamentLeaf = this.buildTournamentLeaf(tournament);

    const contractAddress = this.minaClientService.getContractAddress();
    const contract = new TournamentManager(contractAddress);

    const senderPubKey = PublicKey.fromBase58(op.playerPubKey);

    const tx = await Mina.transaction(senderPubKey, async () => {
      await contract.advanceToBattle(
        Field(op.tournamentId),
        currentTournamentLeaf,
        tournamentWitness
      );
    });

    await tx.prove();

    await this.tournamentStateService.updateOperationStatus(
      op._id,
      OperationStatus.Submitted
    );

    this.logger.log(
      `AdvanceToBattle proof generated for operation ${op._id}`
    );
  }

  private async processFinalizeTournament(
    op: PendingOperationDocument
  ): Promise<void> {
    this.logger.log(
      `FinalizeTournament processing for ${op._id} - requires admin signature`
    );
    await this.tournamentStateService.updateOperationStatus(
      op._id,
      OperationStatus.Submitted
    );
  }

  private buildTournamentLeaf(tournament: TournamentDocument): TournamentLeaf {
    const statusMap: Record<string, UInt32> = {
      Created: ContractTournamentStatus.Created,
      Registration: ContractTournamentStatus.Registration,
      Battle: ContractTournamentStatus.Battle,
      Claiming: ContractTournamentStatus.Claiming,
    };

    const status = statusMap[tournament.verified.status];
    if (!status) {
      throw new Error(`Unknown tournament status: ${tournament.verified.status}`);
    }

    return new TournamentLeaf({
      status,
      registrationStartSlot: UInt32.from(tournament.verified.registrationStartSlot),
      battleStartSlot: UInt32.from(tournament.verified.battleStartSlot),
      battleEndSlot: UInt32.from(tournament.verified.battleEndSlot),
      ticketPrice: UInt64.from(BigInt(tournament.verified.ticketPrice)),
      prize1Percent: UInt32.from(tournament.verified.prize1Percent),
      prize2Percent: UInt32.from(tournament.verified.prize2Percent),
      prize3Percent: UInt32.from(tournament.verified.prize3Percent),
      participantsRoot: Field(tournament.verified.participantsRoot),
      winnersRoot: Field(tournament.verified.winnersRoot),
      prizePool: UInt64.from(BigInt(tournament.verified.prizePool)),
      participantCount: UInt32.from(tournament.verified.participantCount),
    });
  }

  isReady(): boolean {
    return this.isCompiled;
  }
}
