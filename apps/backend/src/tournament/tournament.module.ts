import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../redis/redis.module.js';
import {
  Tournament,
  TournamentSchema,
  PendingOperation,
  PendingOperationSchema,
  TournamentMatch,
  TournamentMatchSchema,
} from './schemas/index.js';
import {
  MinaClientService,
  MerkleService,
  TournamentStateService,
  ProofGeneratorService,
  ChainMonitorService,
  OperationEventsService,
  TournamentLeaderboardService,
  TournamentResultRecorderService,
} from './services/index.js';
import { TournamentController } from './tournament.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: PendingOperation.name, schema: PendingOperationSchema },
      { name: TournamentMatch.name, schema: TournamentMatchSchema },
    ]),
    RedisModule.forFeature(),
  ],
  controllers: [TournamentController],
  providers: [
    MinaClientService,
    MerkleService,
    OperationEventsService,
    TournamentStateService,
    ProofGeneratorService,
    ChainMonitorService,
    TournamentLeaderboardService,
    TournamentResultRecorderService,
  ],
  exports: [
    MinaClientService,
    MerkleService,
    OperationEventsService,
    TournamentStateService,
    ProofGeneratorService,
    ChainMonitorService,
    TournamentLeaderboardService,
    TournamentResultRecorderService,
  ],
})
export class TournamentModule {}
