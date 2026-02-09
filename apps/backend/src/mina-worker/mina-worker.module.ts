import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { MinaWorkerProcessor } from './mina-worker.processor';
import { MinaStateService } from './mina-state.service';
import { MinaSubmitterService } from './mina-submitter.service';
import { GameLeaf, GameLeafSchema } from './schemas/game-leaf.schema';

/**
 * MinaWorkerModule - Handles Mina blockchain job processing
 *
 * This module registers:
 * - BullMQ queue connection for consuming jobs
 * - MinaWorkerProcessor - processes CREATE_GAME and FINISH_GAME jobs
 * - MinaStateService - manages MerkleMap state and generates witnesses
 * - MinaSubmitterService - submits transactions to Mina network
 */
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.BULLMQ_REDIS_HOST || 'localhost',
        port: parseInt(process.env.BULLMQ_REDIS_PORT || '6380', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'mina-blockchain',
    }),
    MongooseModule.forFeature([{ name: GameLeaf.name, schema: GameLeafSchema }]),
  ],
  providers: [MinaWorkerProcessor, MinaStateService, MinaSubmitterService],
  exports: [MinaStateService],
})
export class MinaWorkerModule {}

