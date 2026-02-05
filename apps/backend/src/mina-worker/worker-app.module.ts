import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaWorkerModule } from './mina-worker.module';

/**
 * WorkerAppModule - Root module for the Mina worker process
 *
 * This is a lightweight module that only includes what the worker needs:
 * - MongoDB connection (for persisting state and job results)
 * - MinaWorkerModule (BullMQ processor and services)
 *
 * Unlike AppModule, this does NOT include:
 * - WebSocket gateway
 * - Game session management
 * - Matchmaking service
 * - Health endpoints
 * - Expedition/Inventory modules
 *
 * This keeps the worker process lean and focused on blockchain operations.
 */
@Module({
  imports: [
    // MongoDB for state persistence
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle',
      {
        dbName: process.env.MONGODB_DB || 'wizardbattle',
      },
    ),
    // Mina worker module with BullMQ
    MinaWorkerModule,
  ],
})
export class WorkerAppModule {}

