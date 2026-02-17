/**
 * Mina Worker - Separate Entry Point
 *
 * This is the entry point for the Mina blockchain worker process.
 * Run with: pnpm run start:worker
 *
 * This process:
 * 1. Connects to BullMQ queue (separate Redis instance)
 * 2. Processes CREATE_GAME and FINISH_GAME jobs
 * 3. Generates ZK proofs and submits transactions to Mina
 * 4. Maintains MerkleMap state synchronized with on-chain state
 *
 * Environment variables:
 * - BULLMQ_REDIS_HOST: Redis host for job queue (default: localhost)
 * - BULLMQ_REDIS_PORT: Redis port for job queue (default: 6380)
 * - MINA_NETWORK_URL: Mina network RPC URL
 * - MINA_ADMIN_PRIVATE_KEY: Private key for signing transactions
 * - MINA_CONTRACT_ADDRESS: GameManager contract address
 * - MONGODB_URI: MongoDB connection string
 * - MONGODB_DB: MongoDB database name
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerAppModule } from './mina-worker/worker-app.module';

const logger = new Logger('MinaWorker');

async function bootstrap() {
  logger.log('Starting Mina Worker...');
  logger.log(`BullMQ Redis: ${process.env.BULLMQ_REDIS_HOST || 'localhost'}:${process.env.BULLMQ_REDIS_PORT || 6380}`);
  logger.log(`MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle'}`);

  // Create NestJS application without HTTP server
  // Worker only needs dependency injection, not HTTP endpoints
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Handle shutdown signals
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.log('Mina Worker started successfully');
  logger.log('Waiting for jobs...');
}

bootstrap().catch((error) => {
  logger.error('Failed to start Mina Worker:', error);
  process.exit(1);
});

