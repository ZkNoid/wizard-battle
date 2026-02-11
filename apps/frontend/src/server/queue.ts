import { Queue } from 'bullmq';
import { env } from '@/env';

// Connection to a separate Redis instance for BullMQ
// This keeps blockchain job processing isolated from game state Redis
const connection = {
  host: env.BULLMQ_REDIS_HOST ?? 'localhost',
  port: env.BULLMQ_REDIS_PORT ?? 6380,
};

// Mina blockchain job queue
// Jobs are processed sequentially to ensure MerkleMap state consistency
export const minaQueue = new Queue('mina-blockchain', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs for debugging
      age: 24 * 60 * 60, // Keep jobs for 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep more failed jobs for investigation
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
    },
  },
});

// Job types for type safety
export type MinaJobType = 'CREATE_GAME' | 'FINISH_GAME';

export interface CreateGameJobData {
  type: 'CREATE_GAME';
  gameId: string;
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
  gameId: string;
  roomId: string;
  resultHash: string;
  winner?: string;
  finalStates: Record<string, unknown>;
  finishedAt: number;
}

export type MinaJobData = CreateGameJobData | FinishGameJobData;

// Helper to add jobs with proper typing
export async function addMinaJob(data: MinaJobData) {
  const jobId = `${data.type}-${data.gameId}-${Date.now()}`;
  
  return minaQueue.add(data.type, data, {
    jobId,
    // Ensure sequential processing per game
    // Jobs for the same game will wait for previous ones
  });
}

