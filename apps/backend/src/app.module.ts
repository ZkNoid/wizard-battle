import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameSessionModule } from './game-session/game-session.module';
import { HealthController } from './health/health.controller';
import { RedisHealthService } from './health/redis-health.service';
import { GameStateService } from './game-session/game-state.service';
import { RedisModule } from './redis/redis.module';
import { GameItemModule } from './game-item/game-item.module';
import { GameCommitModule } from './game-commit/game-commit.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserInventoryModule } from './user-inventory/user-inventory.module';

@Module({
  imports: [
    GameSessionModule,
    ScheduleModule.forRoot(),
    RedisModule,
    GameItemModule,
    GameCommitModule,
    UserInventoryModule,
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle',
      {
        dbName: process.env.MONGODB_DB || 'wizardbattle',
      }
    ),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, RedisHealthService, GameStateService],
})
export class AppModule {}
