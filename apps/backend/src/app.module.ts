import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GameSessionModule } from "./game-session/game-session.module";
import { MatchmakingModule } from "./matchmaking/matchmaking.module";

@Module({
  imports: [GameSessionModule, MatchmakingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
