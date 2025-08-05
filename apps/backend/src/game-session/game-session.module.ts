import { Module } from '@nestjs/common';
import { GameSessionGateway } from './game-session.gateway';
import { MatchmakingService } from '../matchmaking/matchmaking.service';

@Module({
    providers: [GameSessionGateway, MatchmakingService],
})
export class GameSessionModule { }