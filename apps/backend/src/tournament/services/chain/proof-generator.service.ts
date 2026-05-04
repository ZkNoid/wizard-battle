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
  WinnerLeaf,
  WinnersInput,
  PrizesInput,
  TournamentStatus as ContractTournamentStatus,
  NUM_WINNERS,
} from '../../../../../mina-contracts/src/TournamentManager.js';
import { RedisService } from '../../../redis/redis.service.js';
import { TournamentStateService } from '../state/tournament-state.service.js';
import { MerkleService } from '../merkle/merkle.service.js';
import { MinaClientService } from './mina-client.service.js';
import {
  PendingOperationDocument,
  OperationStatus,
  OperationType,
} from '../../schemas/pending-operation.schema.js';
import {
  TournamentDocument,
  TournamentStatus,
} from '../../schemas/tournament.schema.js';

type UnsignedZkappTx = Awaited<ReturnType<typeof Mina.transaction>>;

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
      this.logger.warn('Contract not compiled, cannot process queue');
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

  private async processOperation(op: PendingOperationDocument): Promise<void> {
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
        case OperationType.FinalizeTournament:
          await this.processFinalizeTournament(op);
          break;
        case OperationType.ClaimPrize:
          await this.processClaimPrize(op);
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

  private async prepareProofContext(op: PendingOperationDocument) {
    const tournament = await this.tournamentStateService.getVerifiedState(
      op.tournamentId
    );
    if (!tournament) {
      throw new Error(`Tournament ${op.tournamentId} not found`);
    }

    const allTournaments =
      await this.tournamentStateService.getAllTournaments();
    const tournamentsMap =
      this.merkleService.buildTournamentsMap(allTournaments);

    const { tournamentWitness } = this.merkleService.getTournamentWitness(
      tournamentsMap,
      op.tournamentId
    );

    const currentTournamentLeaf = this.buildTournamentLeaf(tournament);
    const contractAddress = this.minaClientService.getContractAddress();
    const contract = new TournamentManager(contractAddress);
    const playerPubKey = PublicKey.fromBase58(op.playerPubKey);

    return {
      tournament,
      tournamentWitness,
      currentTournamentLeaf,
      contractAddress,
      contract,
      playerPubKey,
    };
  }

  /**
   * Fee-payer key for ops where `playerPubKey` is the on-chain admin
   * (FinalizeTournament). When unset or pubkey mismatch, the flow
   * stays wallet-driven.
   */
  private getConfiguredFeePayerKeyIfMatchesOp(
    op: PendingOperationDocument
  ): PrivateKey | null {
    const raw = process.env.TOURNAMENT_ADMIN_PRIVATE_KEY?.trim();
    if (!raw) {
      return null;
    }
    try {
      const sk = PrivateKey.fromBase58(raw);
      if (sk.toPublicKey().toBase58() !== op.playerPubKey) {
        return null;
      }
      return sk;
    } catch {
      this.logger.warn(
        'TOURNAMENT_ADMIN_PRIVATE_KEY is set but could not be parsed as a Base58 private key'
      );
      return null;
    }
  }

  private async submitProvedTransaction(
    op: PendingOperationDocument,
    tx: UnsignedZkappTx
  ): Promise<void> {
    await tx.prove();

    const feePayerKey = this.getConfiguredFeePayerKeyIfMatchesOp(op);
    if (op.type === OperationType.FinalizeTournament) {
      if (!feePayerKey) {
        throw new Error('No fee payer key found');
      }
      tx.sign([feePayerKey]);
      const pending = await tx.send();
      await this.tournamentStateService.updateOperationStatus(
        op._id,
        OperationStatus.Submitted,
        { txHash: pending.hash }
      );
      this.logger.log(
        `${op.type} operation ${op._id} signed and broadcast as ${pending.hash}`
      );
      return;
    }

    const unsignedTxJson = tx.toJSON();

    await this.tournamentStateService.updateOperationStatus(
      op._id,
      OperationStatus.Submitted,
      { unsignedTxJson: JSON.stringify(unsignedTxJson) }
    );

    this.logger.log(
      `${op.type} proof generated for operation ${op._id}, awaiting frontend signature`
    );
  }

  private async processBuyTicket(op: PendingOperationDocument): Promise<void> {
    const {
      tournament,
      tournamentWitness,
      currentTournamentLeaf,
      contractAddress,
      contract,
      playerPubKey,
    } = await this.prepareProofContext(op);

    const participantsMap = this.merkleService.buildParticipantsMap(
      tournament.participants
    );

    if (
      !this.merkleService.verifyParticipantNotRegistered(
        participantsMap,
        op.playerPubKey
      )
    ) {
      throw new Error(`Player ${op.playerPubKey} is already registered`);
    }

    const { witness: participantWitness } =
      this.merkleService.computeNewParticipantsRoot(
        this.merkleService.buildParticipantsMap(tournament.participants),
        op.playerPubKey
      );

    const ticketPrice = UInt64.from(BigInt(tournament.verified.ticketPrice));

    const tx = await Mina.transaction(playerPubKey, async () => {
      const playerUpdate = AccountUpdate.createSigned(playerPubKey);
      playerUpdate.balance.subInPlace(ticketPrice);

      await contract.buyTicket(
        Field(op.tournamentId),
        currentTournamentLeaf,
        tournamentWitness,
        participantWitness
      );
    });

    await this.submitProvedTransaction(op, tx);
  }

  private async processFinalizeTournament(
    op: PendingOperationDocument
  ): Promise<void> {
    const {
      tournament,
      tournamentWitness,
      currentTournamentLeaf,
      contract,
      playerPubKey,
    } = await this.prepareProofContext(op);

    if (tournament.verified.status !== TournamentStatus.Battle) {
      throw new Error(
        `Tournament ${op.tournamentId} must be in Battle phase to finalize (status: ${tournament.verified.status})`
      );
    }

    const rows = op.finalizeWinners;
    if (!rows?.length) {
      throw new Error(
        `FinalizeTournament operation ${op._id} is missing finalizeWinners`
      );
    }

    const sorted = [...rows].sort((a, b) => a.place - b.place);
    const first = sorted[0];
    if (!first) {
      throw new Error(
        `FinalizeTournament operation ${op._id} has empty finalizeWinners`
      );
    }

    const winnerEntries = new Map<
      string,
      { prizeAmount: string; claimed: boolean }
    >();
    for (const w of sorted) {
      winnerEntries.set(w.publicKey, {
        prizeAmount: w.prizeAmount,
        claimed: false,
      });
    }
    const winnersMap = this.merkleService.buildWinnersMap(winnerEntries);
    const newWinnersRoot = winnersMap.getRoot();

    const winnersInput = new WinnersInput({
      items: Array.from({ length: NUM_WINNERS }, (_, i) => {
        const entry = sorted[i];
        return entry ? PublicKey.fromBase58(entry.publicKey) : PublicKey.empty();
      }),
    });

    const prizesInput = new PrizesInput({
      items: Array.from({ length: NUM_WINNERS }, (_, i) => {
        const entry = sorted[i];
        return entry ? UInt64.from(BigInt(entry.prizeAmount)) : UInt64.from(0);
      }),
    });

    const tx = await Mina.transaction(
      { sender: playerPubKey, fee: 100_000_000 },
      async () => {
        await contract.finalizeTournament(
          Field(op.tournamentId),
          currentTournamentLeaf,
          tournamentWitness,
          winnersInput,
          prizesInput,
          newWinnersRoot
        );
      }
    );

    await this.submitProvedTransaction(op, tx);
  }

  private async processClaimPrize(op: PendingOperationDocument): Promise<void> {
    const {
      tournament,
      tournamentWitness,
      currentTournamentLeaf,
      contract,
      playerPubKey,
    } = await this.prepareProofContext(op);

    if (tournament.verified.status !== 'Claiming') {
      throw new Error(
        `Tournament ${op.tournamentId} is not in claiming phase (status: ${tournament.verified.status})`
      );
    }

    const winnerInfo = tournament.winners?.get(op.playerPubKey);
    if (!winnerInfo) {
      throw new Error(
        `Player ${op.playerPubKey} is not a winner in tournament ${op.tournamentId}`
      );
    }
    if (winnerInfo.claimed) {
      throw new Error(
        `Player ${op.playerPubKey} has already claimed their prize`
      );
    }

    const winnersMap = this.merkleService.buildWinnersMap(tournament.winners);
    const { winnerWitness, winnerLeaf } = this.merkleService.getWinnerWitness(
      winnersMap,
      op.playerPubKey,
      winnerInfo
    );

    const tx = await Mina.transaction(playerPubKey, async () => {
      await contract.claimPrize(
        Field(op.tournamentId),
        currentTournamentLeaf,
        tournamentWitness,
        winnerLeaf,
        winnerWitness
      );
    });

    await this.submitProvedTransaction(op, tx);
  }

  private buildTournamentLeaf(tournament: TournamentDocument): TournamentLeaf {
    const statusMap: Record<string, UInt32> = {
      Created: ContractTournamentStatus.Created,
      Battle: ContractTournamentStatus.Battle,
      Claiming: ContractTournamentStatus.Claiming,
    };

    const status = statusMap[tournament.verified.status];
    if (!status) {
      throw new Error(
        `Unknown tournament status: ${tournament.verified.status}`
      );
    }

    const prizePercents = Array.from({ length: NUM_WINNERS }, (_, i) =>
      UInt32.from(tournament.verified.prizePercents[i] ?? 0)
    );

    return new TournamentLeaf({
      status,
      battleStartSlot: UInt32.from(tournament.verified.battleStartSlot),
      battleEndSlot: UInt32.from(tournament.verified.battleEndSlot),
      ticketPrice: UInt64.from(BigInt(tournament.verified.ticketPrice)),
      prizePercents,
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
