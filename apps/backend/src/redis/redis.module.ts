import { DynamicModule, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { REDIS_URL } from './redis.constants';

export interface RedisModuleOptions {
  url: string;
}

@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        { provide: REDIS_URL, useValue: options.url },
        RedisService,
      ],
      exports: [RedisService],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: RedisModule,
      exports: [RedisService],
    };
  }
}
