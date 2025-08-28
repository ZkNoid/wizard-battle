import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';
import { GamePhaseSchedulerService } from './game-phase-scheduler.service';
import { BotModule } from '../bot/bot.module';

@Module({
    imports: [
        BotModule,
        ScheduleModule.forRoot(), // ✅ Enable cron jobs
    ],
    providers: [
        GameSessionGateway, 
        MatchmakingService, 
        GameStateService,
        GamePhaseSchedulerService, // ✅ Add scheduler service
    ],
    exports: [MatchmakingService, GameStateService],
})
export class GameSessionModule { }