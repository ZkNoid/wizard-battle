import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from './redis/redis.module';
import { TournamentModule } from './tournament/tournament.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/wizardbattle',
      {
        dbName: process.env.MONGODB_DB || 'wizardbattle',
      }
    ),
    RedisModule.forRoot({
      url: process.env.TOURNAMENT_REDIS_URL || 'redis://redis-tournament:6379',
    }),
    TournamentModule,
  ],
  controllers: [],
  providers: [],
})
export class MinaAppModule {}
