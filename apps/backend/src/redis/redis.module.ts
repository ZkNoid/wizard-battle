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
      global: true,
      providers: [
        { provide: REDIS_URL, useValue: options.url },
        RedisService,
      ],
      exports: [RedisService],
    };
  }

  /**
   * Import in child modules to declare the dependency on RedisService.
   * The actual provider is registered once via forRoot() at the app root.
   */
  static forFeature(): DynamicModule {
    return {
      module: RedisModule,
    };
  }
}
