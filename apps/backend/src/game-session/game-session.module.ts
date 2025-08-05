import { Module } from '@nestjs/common';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { GameStateService } from './game-state.service';

@Module({
    providers: [GameSessionGateway, MatchmakingService, GameStateService],
})
export class GameSessionModule { }