import { Module } from "@nestjs/common";
import { MatchmakingService } from "./matchmaking.service";
import { MatchmakingGateway } from "./matchmaking.gateway";
import { GameSessionModule } from "../game-session/game-session.module";
import { BotModule } from "../bot/bot.module";

@Module({
  imports: [GameSessionModule, BotModule],
  providers: [MatchmakingService, MatchmakingGateway],
})
export class MatchmakingModule {}
