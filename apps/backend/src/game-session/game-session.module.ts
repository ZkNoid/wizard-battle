import { Module } from '@nestjs/common';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';
import { BotModule } from '../bot/bot.module';

@Module({
    imports: [BotModule],
    providers: [GameSessionGateway, MatchmakingService, GameStateService],
    exports: [MatchmakingService, GameStateService],
})
export class GameSessionModule { }