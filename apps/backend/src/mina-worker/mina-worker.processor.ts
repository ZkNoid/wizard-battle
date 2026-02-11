import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, DelayedError } from 'bullmq';
import { MinaStateService } from './mina-state.service';
import { MinaSubmitterService } from './mina-submitter.service';

// Job data types - must match frontend queue.ts definitions
export interface CreateGameJobData {
  type: 'CREATE_GAME';
  gameId: number;
  roomId: string;
  setupHash: string;
  players: {
    id: string;
    publicKey?: string;
  }[];
  createdAt: number;
}

export interface FinishGameJobData {
  type: 'FINISH_GAME';
  gameId: number;
  roomId: string;
  resultHash: string;
  winner?: string;
  finalStates: Record<string, unknown>;
  finishedAt: number;
}

export type MinaJobData = CreateGameJobData | FinishGameJobData;

/**
 * MinaWorkerProcessor - BullMQ processor for Mina blockchain jobs
 *
 * Processes jobs sequentially to maintain MerkleMap state consistency.
 * Each job:
 * 1. Fetches current state from MinaStateService
 * 2. Generates witness for the MerkleMap update
 * 3. Submits transaction to Mina via MinaSubmitterService
 * 4. Updates local state on success
 */
@Processor('mina-blockchain', {
  // Process one job at a time to ensure state consistency
  concurrency: 1,
  // Lock jobs for 5 minutes (proof generation can take time)
  lockDuration: 5 * 60 * 1000,
})
export class MinaWorkerProcessor extends WorkerHost {
  private readonly logger = new Logger(MinaWorkerProcessor.name);

  constructor(
    private readonly stateService: MinaStateService,
    private readonly submitterService: MinaSubmitterService,
  ) {
    super();
  }

  async process(job: Job<MinaJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.data.type}`);

    try {
      switch (job.data.type) {
        case 'CREATE_GAME':
          await this.processCreateGame(job as Job<CreateGameJobData>);
          break;
        case 'FINISH_GAME':
          await this.processFinishGame(job as Job<FinishGameJobData>);
          break;
        default:
          throw new Error(`Unknown job type: ${(job.data as any).type}`);
      }
    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Process CREATE_GAME job
   * Calls GameManager.startGame() on Mina
   */
  private async processCreateGame(job: Job<CreateGameJobData>): Promise<void> {
    const { gameId, setupHash, players } = job.data;

    this.logger.log(`Creating game ${gameId} with ${players.length} players`);

    // Update job progress
    await job.updateProgress(10);

    // 1. Get witness for the game slot in MerkleMap
    const witness = await this.stateService.getWitnessForNewGame(gameId);
    await job.updateProgress(30);

    // 2. Submit startGame transaction to Mina
    const txHash = await this.submitterService.submitStartGame(
      gameId,
      setupHash,
      witness,
    );
    await job.updateProgress(70);

    // 3. Update local state (optimistically, will be confirmed by chain watcher)
    await this.stateService.recordGameStarted(gameId, setupHash);
    await job.updateProgress(100);

    this.logger.log(`Game ${gameId} created successfully. TX: ${txHash}`);
  }

  /**
   * Process FINISH_GAME job
   * Calls GameManager.finishGame() on Mina
   * 
   * IMPORTANT: This job will wait/retry if CREATE_GAME hasn't completed yet
   */
  private async processFinishGame(job: Job<FinishGameJobData>): Promise<void> {
    const { gameId, resultHash } = job.data;

    this.logger.log(`Finishing game ${gameId}`);

    // Update job progress
    await job.updateProgress(10);

    // 1. Get current game state and verify it's ready
    const gameState = await this.stateService.getGameState(gameId);
    
    // If game doesn't exist or isn't started yet, delay and retry
    if (!gameState) {
      this.logger.warn(`Game ${gameId} not found, delaying FINISH_GAME job...`);
      // Move job to delayed state - will retry in 5 seconds
      await job.moveToDelayed(Date.now() + 5000);
      // Throw to exit current processing (job will be picked up again after delay)
      throw new DelayedError(`Game ${gameId} not yet created, retrying in 5s`);
    }

    if (gameState.status !== 'started') {
      this.logger.warn(`Game ${gameId} is in '${gameState.status}' state, expected 'started'`);
      if (gameState.status === 'pending') {
        // CREATE_GAME job is still processing, wait for it
        await job.moveToDelayed(Date.now() + 5000);
        throw new DelayedError(`Game ${gameId} still pending, retrying in 5s`);
      }
      // Game already finished or in wrong state
      throw new Error(`Game ${gameId} cannot be finished, current status: ${gameState.status}`);
    }

    await job.updateProgress(20);

    const witness = await this.stateService.getWitnessForGame(gameId);
    await job.updateProgress(40);

    // 2. Submit finishGame transaction to Mina
    const txHash = await this.submitterService.submitFinishGame(
      gameId,
      resultHash,
      witness,
      gameState.setupHash,
    );
    await job.updateProgress(80);

    // 3. Update local state
    const challengeDeadlineSlot = this.stateService.computeChallengeDeadlineSlot();
    await this.stateService.recordGameFinished(gameId, resultHash, challengeDeadlineSlot);
    await job.updateProgress(100);

    this.logger.log(`Game ${gameId} finished successfully. TX: ${txHash}`);
  }

  // Event handlers for logging/monitoring
  @OnWorkerEvent('completed')
  onCompleted(job: Job<MinaJobData>) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MinaJobData>, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<MinaJobData>) {
    this.logger.log(`Job ${job.id} is now active`);
  }
}

