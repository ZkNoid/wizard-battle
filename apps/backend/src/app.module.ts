import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameSessionModule } from './game-session/game-session.module';
import { HealthController } from './health/health.controller';
import { RedisHealthService } from './health/redis-health.service';
import { GameStateService } from './game-session/game-state.service';

@Module({
  imports: [GameSessionModule, ScheduleModule.forRoot()],
  controllers: [AppController, HealthController],
  providers: [AppService, RedisHealthService, GameStateService],
})
export class AppModule {}
