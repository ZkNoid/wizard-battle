import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';
import { GamePhaseSchedulerService } from './game-phase-scheduler.service';
import { BotModule } from '../bot/bot.module';
import { RedisModule } from '../redis/redis.module';
import { RewardModule } from '../reward/reward.module';
import { QuestsModule } from '../quests/quests.module';
import { TournamentResultsModule } from '../tournament/tournament-results.module';

@Module({
  imports: [
    BotModule,
    RedisModule,
    ScheduleModule.forRoot(),
    RewardModule,
    QuestsModule,
    TournamentResultsModule,
  ],
  providers: [
    GameSessionGateway,
    MatchmakingService,
    GameStateService,
    GamePhaseSchedulerService,
  ],
  exports: [MatchmakingService, GameStateService],
})
export class GameSessionModule {}
