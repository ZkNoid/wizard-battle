import { Module } from "@nestjs/common";
import { GameSessionService } from "./game-session.service";
import { GameSessionGateway } from "./game-session.gateway";

@Module({
  providers: [GameSessionService, GameSessionGateway],
  exports: [GameSessionService],
})
export class GameSessionModule {}
