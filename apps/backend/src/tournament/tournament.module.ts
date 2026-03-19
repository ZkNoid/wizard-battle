import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../redis/redis.module.js';
import {
  Tournament,
  TournamentSchema,
  PendingOperation,
  PendingOperationSchema,
} from './schemas/index.js';
import {
  MinaClientService,
  MerkleService,
  TournamentStateService,
  ProofGeneratorService,
  ChainMonitorService,
  OperationEventsService,
} from './services/index.js';
import { TournamentController } from './tournament.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: PendingOperation.name, schema: PendingOperationSchema },
    ]),
    RedisModule,
  ],
  controllers: [TournamentController],
  providers: [
    MinaClientService,
    MerkleService,
    OperationEventsService,
    TournamentStateService,
    ProofGeneratorService,
    ChainMonitorService,
  ],
  exports: [
    MinaClientService,
    MerkleService,
    OperationEventsService,
    TournamentStateService,
    ProofGeneratorService,
    ChainMonitorService,
  ],
})
export class TournamentModule {}
