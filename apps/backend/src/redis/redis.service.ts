import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { REDIS_URL } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redisClient: RedisClientType;
  private isConnected = false;

  constructor(@Inject(REDIS_URL) private readonly redisUrl: string) {
    this.redisClient = createClient({ url: this.redisUrl });

    this.redisClient.on('error', (err) =>
      console.error(`RedisService [${this.redisUrl}] Error`, err)
    );

    this.redisClient.on('connect', () => {
      console.log(`RedisService [${this.redisUrl}] Connected`);
      this.isConnected = true;
    });

    this.redisClient.on('disconnect', () => {
      console.log(`RedisService [${this.redisUrl}] Disconnected`);
      this.isConnected = false;
    });

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  getClient(): RedisClientType {
    return this.redisClient;
  }

  isRedisConnected(): boolean {
    return this.isConnected;
  }

  async onModuleDestroy() {
    if (this.redisClient && this.isConnected) {
      await this.redisClient.disconnect();
    }
  }
}
