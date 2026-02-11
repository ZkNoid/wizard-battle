import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import clientPromise from '@/server/db';
import { env } from '@/env';
import { addMinaJob } from '@/server/queue';
import { randomUUID } from 'crypto';

const client = await clientPromise;
const db = client?.db(env.MONGODB_DB);

// Collection for tracking Mina game records
const minaGamesCollection = 'mina_games';

// Game status enum matching the smart contract
export const MinaGameStatus = {
  PENDING: 'pending', // Job queued, waiting for processing
  STARTED: 'started', // startGame tx confirmed on Mina
  AWAITING_CHALLENGE: 'awaiting_challenge', // finishGame tx confirmed, in challenge window
  FINALIZED_OK: 'finalized_ok', // Game finalized without fraud
  FINALIZED_FRAUD: 'finalized_fraud', // Game finalized with fraud proof
  FAILED: 'failed', // Job processing failed
} as const;

export type MinaGameStatus = (typeof MinaGameStatus)[keyof typeof MinaGameStatus];

// Schema for Mina game record stored in MongoDB
export interface MinaGameRecord {
  gameId: string; // Unique identifier (used as Field in contract)
  roomId: string; // Reference to game room
  status: MinaGameStatus;
  setupHash?: string; // Hash of game setup (players, initial state)
  resultHash?: string; // Hash of game result
  players: {
    id: string;
    publicKey?: string;
  }[];
  winner?: string;
  finalStates?: Record<string, unknown>;
  // Job tracking
  createGameJobId?: string;
  finishGameJobId?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date; // When startGame tx was confirmed
  finishedAt?: Date; // When finishGame tx was confirmed
  finalizedAt?: Date; // When game was finalized (timeout or proof)
  // Transaction hashes for verification
  startGameTxHash?: string;
  finishGameTxHash?: string;
  finalizeTxHash?: string;
  // Challenge window
  challengeDeadlineSlot?: number;
  // Error tracking
  lastError?: string;
}

export const minaRouter = createTRPCRouter({
  /**
   * Create a new game on the Mina blockchain
   * This queues a job to call GameManager.startGame()
   */
  createGame: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
        players: z.array(
          z.object({
            id: z.string(),
            publicKey: z.string().optional(),
          })
        ),
        setupData: z.record(z.unknown()).optional(), // Additional setup data to hash
      })
    )
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // Generate unique game ID
      const gameId = randomUUID();

      // Compute setup hash from players and setup data
      // In production, this should use Poseidon hash to match o1js
      const setupHash = computeSetupHash(input.players, input.setupData);

      const now = new Date();

      // Create game record in MongoDB
      const gameRecord: MinaGameRecord = {
        gameId,
        roomId: input.roomId,
        status: MinaGameStatus.PENDING,
        setupHash,
        players: input.players,
        createdAt: now,
        updatedAt: now,
      };

      await db.collection(minaGamesCollection).insertOne(gameRecord);

      // Queue job to BullMQ
      const job = await addMinaJob({
        type: 'CREATE_GAME',
        gameId,
        roomId: input.roomId,
        setupHash,
        players: input.players,
        createdAt: now.getTime(),
      });

      // Update record with job ID
      await db.collection(minaGamesCollection).updateOne(
        { gameId },
        {
          $set: {
            createGameJobId: job.id,
            updatedAt: new Date(),
          },
        }
      );

      return {
        gameId,
        roomId: input.roomId,
        status: MinaGameStatus.PENDING,
        jobId: job.id,
        setupHash,
      };
    }),

  /**
   * Finish a game on the Mina blockchain
   * This queues a job to call GameManager.finishGame()
   */
  finishGame: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        winner: z.string().optional(),
        finalStates: z.record(z.unknown()), // Final state of each player
      })
    )
    .mutation(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      // Fetch existing game record
      const gameRecord = (await db
        .collection(minaGamesCollection)
        .findOne({ gameId: input.gameId })) as unknown as MinaGameRecord | null;

      if (!gameRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Game with id "${input.gameId}" not found`,
        });
      }

      // Validate game is in correct state
      if (gameRecord.status !== MinaGameStatus.STARTED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Game must be in STARTED state to finish. Current state: ${gameRecord.status}`,
        });
      }

      // Compute result hash from final states
      // In production, this should use Poseidon hash to match o1js
      const resultHash = computeResultHash(input.finalStates, input.winner);

      const now = new Date();

      // Queue job to BullMQ
      const job = await addMinaJob({
        type: 'FINISH_GAME',
        gameId: input.gameId,
        roomId: gameRecord.roomId,
        resultHash,
        winner: input.winner,
        finalStates: input.finalStates,
        finishedAt: now.getTime(),
      });

      // Update game record
      await db.collection(minaGamesCollection).updateOne(
        { gameId: input.gameId },
        {
          $set: {
            status: MinaGameStatus.PENDING, // Back to pending while job processes
            resultHash,
            winner: input.winner,
            finalStates: input.finalStates,
            finishGameJobId: job.id,
            updatedAt: now,
          },
        }
      );

      return {
        gameId: input.gameId,
        status: MinaGameStatus.PENDING,
        jobId: job.id,
        resultHash,
      };
    }),

  /**
   * Get game status from Mina tracking
   */
  getGameStatus: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const gameRecord = (await db
        .collection(minaGamesCollection)
        .findOne({ gameId: input.gameId })) as unknown as MinaGameRecord | null;

      if (!gameRecord) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Game with id "${input.gameId}" not found`,
        });
      }

      return gameRecord;
    }),

  /**
   * Get all games for a room
   */
  getGamesByRoom: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input }) => {
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not connected',
        });
      }

      const games = (await db
        .collection(minaGamesCollection)
        .find({ roomId: input.roomId })
        .sort({ createdAt: -1 })
        .toArray()) as unknown as MinaGameRecord[];

      return games;
    }),

  /**
   * Get pending games (for monitoring/admin)
   */
  getPendingGames: publicProcedure.query(async () => {
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not connected',
      });
    }

    const games = (await db
      .collection(minaGamesCollection)
      .find({ status: MinaGameStatus.PENDING })
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray()) as unknown as MinaGameRecord[];

    return games;
  }),
});

// Helper functions for computing hashes
// These should be replaced with proper Poseidon hashes in production
// to match the o1js contract requirements

function computeSetupHash(
  players: { id: string; publicKey?: string }[],
  setupData?: Record<string, unknown>
): string {
  // Simple hash for now - in production use Poseidon
  const data = JSON.stringify({ players, setupData });
  // Use a simple hash that can be deterministically computed
  // In production, this needs to match the on-chain setupHash computation
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
}

function computeResultHash(
  finalStates: Record<string, unknown>,
  winner?: string
): string {
  // Simple hash for now - in production use Poseidon
  const data = JSON.stringify({ finalStates, winner });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
}

export type MinaRouter = typeof minaRouter;

