import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Mina,
  PublicKey,
  Field,
  UInt64,
  PrivateKey,
  AccountUpdate,
  fetchAccount,
} from 'o1js';
import {
  TournamentManager,
  WinnersInput,
  PrizesInput,
  NUM_WINNERS,
} from '../../../../../mina-contracts/src/TournamentManager.js';
import { RedisService } from '../../../redis/redis.service.js';
import { TournamentStateService } from '../state/tournament-state.service.js';
import { TournamentOptimisticOverlayService } from '../state/tournament-optimistic-overlay.service.js';
import { MerkleService } from '../merkle/merkle.service.js';
import { MinaClientService } from './mina-client.service.js';
import {
  PendingOperationDocument,
  OperationStatus,
  OperationType,
} from '../../schemas/pending-operation.schema.js';
import { TournamentStatus } from '../../schemas/tournament.schema.js';

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
    private readonly minaClientService: MinaClientService,
    private readonly overlayService: TournamentOptimisticOverlayService
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

  /**
   * Initial lock window. Must comfortably exceed a single proof generation
   * worst-case so we don't lose the lock between heartbeats.
   */
  private static readonly PROOF_LOCK_TTL_SECONDS = 15 * 60;

  /** How often we refresh the lock TTL while processing is in flight. */
  private static readonly PROOF_LOCK_HEARTBEAT_MS = 60_000;

  async processQueue(tournamentId: string): Promise<void> {
    if (!this.isCompiled) {
      this.logger.warn('Contract not compiled, cannot process queue');
      return;
    }

    const redis = this.redisService.getClient();
    const lockKey = `tournament:${tournamentId}:proof-lock`;
    // Unique token so we never delete or refresh a lock that was taken over
    // by another worker after a TTL expiry.
    const lockToken = `${process.pid}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2)}`;

    const acquired = await redis.set(lockKey, lockToken, {
      EX: ProofGeneratorService.PROOF_LOCK_TTL_SECONDS,
      NX: true,
    });

    if (!acquired) {
      this.logger.debug(
        `Could not acquire lock for tournament ${tournamentId}`
      );
      return;
    }

    this.processingTournaments.add(tournamentId);

    const heartbeat = setInterval(() => {
      this.refreshProofLock(lockKey, lockToken).catch((err) => {
        this.logger.warn(
          `Heartbeat refresh failed for ${lockKey}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      });
    }, ProofGeneratorService.PROOF_LOCK_HEARTBEAT_MS);
    // Don't keep the event loop alive solely for the heartbeat.
    if (typeof heartbeat.unref === 'function') {
      heartbeat.unref();
    }

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
      clearInterval(heartbeat);
      await this.releaseProofLock(lockKey, lockToken);
      this.processingTournaments.delete(tournamentId);
    }
  }

  /**
   * Atomically extend the TTL only if we still own the lock. Prevents a
   * stalled worker from refreshing a lock another worker already took over.
   */
  private async refreshProofLock(
    lockKey: string,
    expectedToken: string
  ): Promise<void> {
    const redis = this.redisService.getClient();
    const lua = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('EXPIRE', KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const result = await redis.eval(lua, {
      keys: [lockKey],
      arguments: [
        expectedToken,
        ProofGeneratorService.PROOF_LOCK_TTL_SECONDS.toString(),
      ],
    });
    if (Number(result) !== 1) {
      this.logger.warn(
        `Lost ownership of lock ${lockKey} during heartbeat (token mismatch or expired)`
      );
    }
  }

  /** Compare-and-delete so we never wipe somebody else's lock. */
  private async releaseProofLock(
    lockKey: string,
    expectedToken: string
  ): Promise<void> {
    const redis = this.redisService.getClient();
    const lua = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
    `;
    try {
      await redis.eval(lua, {
        keys: [lockKey],
        arguments: [expectedToken],
      });
    } catch (err) {
      this.logger.warn(
        `Failed to release lock ${lockKey}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
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
        case OperationType.SponsorFund:
          await this.processSponsorFund(op);
          break;
        case OperationType.RecoverUnclaimed:
          await this.processRecoverUnclaimed(op);
          break;
        default:
          throw new Error(`Unknown operation type: ${op.type as string}`);
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

  /**
   * Build the proof inputs for `op` by overlaying every Submitted-but-not-
   * yet-confirmed mutation on top of verified state. This lets the second
   * concurrent proof reference the witness chain that *will* exist on
   * inclusion of the first transaction, so back-to-back ops compose
   * without the chain rejecting the later proofs for stale roots.
   */
  private async prepareProofContext(op: PendingOperationDocument) {
    const overlay = await this.overlayService.getOverlayForOperation(op);

    const contractAddress = this.minaClientService.getContractAddress();
    const contract = new TournamentManager(contractAddress);
    const playerPubKey = PublicKey.fromBase58(op.playerPubKey);

    // Pre-fetch all accounts the proof will read (`getAndRequireEquals`,
    // `requireSignature`, `balance.subInPlace`). Without these calls o1js has
    // no cached account state and proof generation either fails or proves
    // against stale/empty state, producing transactions the network rejects.
    await this.fetchProofAccounts(contractAddress, playerPubKey);

    if (overlay.foldedOps.length > 0) {
      this.logger.log(
        `Op ${op._id} (${op.type}) proving against overlay with ${overlay.foldedOps.length} ` +
          `pending mutation(s) folded in for tournament ${op.tournamentId}`
      );
    }

    return {
      overlay,
      tournamentWitness: overlay.tournamentWitness,
      currentTournamentLeaf: overlay.leaf,
      contractAddress,
      contract,
      playerPubKey,
    };
  }

  private async fetchProofAccounts(
    contractAddress: PublicKey,
    playerPubKey: PublicKey
  ): Promise<void> {
    const targets: { label: string; publicKey: PublicKey }[] = [
      { label: 'contract', publicKey: contractAddress },
      { label: 'sender', publicKey: playerPubKey },
    ];

    await Promise.all(
      targets.map(async ({ label, publicKey }) => {
        try {
          const result = await fetchAccount({ publicKey });
          if (!result.account) {
            throw new Error(
              `fetchAccount(${label}=${publicKey.toBase58()}) returned no account`
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to fetch ${label} account ${publicKey.toBase58()} before proving`,
            error instanceof Error ? error.stack : undefined
          );
          throw error;
        }
      })
    );
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
    // All admin-signed phase transitions are broadcast directly from the
    // backend; player-driven ops still hand the unsigned tx back to the
    // wallet for signing.
    const adminDriven =
      op.type === OperationType.FinalizeTournament ||
      op.type === OperationType.RecoverUnclaimed;
    if (adminDriven) {
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
      overlay,
      tournamentWitness,
      currentTournamentLeaf,
      contract,
      playerPubKey,
    } = await this.prepareProofContext(op);

    if (
      !this.merkleService.verifyParticipantNotRegistered(
        overlay.participantsMap,
        op.playerPubKey
      )
    ) {
      throw new Error(
        `Player ${op.playerPubKey} is already registered (per overlay state)`
      );
    }

    const { participantWitness } = this.merkleService.getParticipantWitness(
      overlay.participantsMap,
      op.playerPubKey
    );

    const ticketPrice = UInt64.from(BigInt(overlay.snapshot.ticketPrice));

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
      overlay,
      tournamentWitness,
      currentTournamentLeaf,
      contract,
      playerPubKey,
    } = await this.prepareProofContext(op);

    if (overlay.snapshot.status !== TournamentStatus.Battle) {
      throw new Error(
        `Tournament ${op.tournamentId} must be in Battle phase to finalize (overlay status: ${overlay.snapshot.status})`
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
      overlay,
      tournamentWitness,
      currentTournamentLeaf,
      contract,
      playerPubKey,
    } = await this.prepareProofContext(op);

    if (overlay.snapshot.status !== TournamentStatus.Claiming) {
      throw new Error(
        `Tournament ${op.tournamentId} is not in claiming phase (overlay status: ${overlay.snapshot.status})`
      );
    }

    const winnerInfo = overlay.snapshot.winners.get(op.playerPubKey);
    if (!winnerInfo) {
      throw new Error(
        `Player ${op.playerPubKey} is not a winner in tournament ${op.tournamentId}`
      );
    }
    if (winnerInfo.claimed) {
      throw new Error(
        `Player ${op.playerPubKey} has already claimed their prize (per overlay state)`
      );
    }

    const { winnerWitness, winnerLeaf } = this.merkleService.getWinnerWitness(
      overlay.winnersMap,
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

  private async processSponsorFund(
    op: PendingOperationDocument
  ): Promise<void> {
    const {
      overlay,
      tournamentWitness,
      currentTournamentLeaf,
      contract,
      playerPubKey,
    } = await this.prepareProofContext(op);

    if (overlay.snapshot.status !== TournamentStatus.Battle) {
      throw new Error(
        `SponsorFund: tournament ${op.tournamentId} must be in Battle phase (overlay status: ${overlay.snapshot.status})`
      );
    }

    if (!op.sponsorAmount) {
      throw new Error(
        `SponsorFund operation ${op._id} is missing sponsorAmount`
      );
    }

    let amountBn: bigint;
    try {
      amountBn = BigInt(op.sponsorAmount);
    } catch {
      throw new Error(
        `SponsorFund operation ${op._id} has non-numeric sponsorAmount`
      );
    }
    if (amountBn <= 0n) {
      throw new Error(
        `SponsorFund operation ${op._id}: sponsorAmount must be > 0`
      );
    }

    const amount = UInt64.from(amountBn);

    const tx = await Mina.transaction(playerPubKey, async () => {
      const sponsorUpdate = AccountUpdate.createSigned(playerPubKey);
      sponsorUpdate.balance.subInPlace(amount);

      await contract.sponsorFund(
        Field(op.tournamentId),
        currentTournamentLeaf,
        tournamentWitness,
        amount
      );
    });

    await this.submitProvedTransaction(op, tx);
  }

  private async processRecoverUnclaimed(
    op: PendingOperationDocument
  ): Promise<void> {
    const {
      overlay,
      tournamentWitness,
      currentTournamentLeaf,
      contract,
      playerPubKey,
    } = await this.prepareProofContext(op);

    if (overlay.snapshot.status !== TournamentStatus.Claiming) {
      throw new Error(
        `RecoverUnclaimed: tournament ${op.tournamentId} must be in Claiming phase (overlay status: ${overlay.snapshot.status})`
      );
    }

    const currentSlot = await this.minaClientService.getCurrentSlot();
    if (currentSlot < overlay.snapshot.claimDeadlineSlot) {
      throw new Error(
        `RecoverUnclaimed: claim window still open until slot ${overlay.snapshot.claimDeadlineSlot} (current: ${currentSlot})`
      );
    }

    const tx = await Mina.transaction(
      { sender: playerPubKey, fee: 100_000_000 },
      async () => {
        await contract.recoverUnclaimed(
          Field(op.tournamentId),
          currentTournamentLeaf,
          tournamentWitness
        );
      }
    );

    await this.submitProvedTransaction(op, tx);
  }

  isReady(): boolean {
    return this.isCompiled;
  }
}
