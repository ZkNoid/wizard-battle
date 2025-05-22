import { Module } from "@nestjs/common";
import { MatchmakingService } from "./matchmaking.service";
import { MatchmakingGateway } from "./matchmaking.gateway";
import { GameSessionModule } from "../game-session/game-session.module";

@Module({
  imports: [GameSessionModule],
  providers: [MatchmakingService, MatchmakingGateway],
})
export class MatchmakingModule {}
