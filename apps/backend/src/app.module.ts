import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GameSessionModule } from "./game-session/game-session.module";
import { HealthController } from "./health/health.controller";
import { RedisHealthService } from "./health/redis-health.service";
import { GameStateService } from "./game-session/game-state.service";

@Module({
  imports: [GameSessionModule],
  controllers: [AppController, HealthController],
  providers: [AppService, RedisHealthService, GameStateService],
})
export class AppModule {}
