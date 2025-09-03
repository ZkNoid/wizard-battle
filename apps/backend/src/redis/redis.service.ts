import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redisClient: RedisClientType;
  private isConnected = false;

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.redisClient.on('error', (err) =>
      console.error('RedisService Redis Client Error', err)
    );

    this.redisClient.on('connect', () => {
      console.log('RedisService Redis Connected');
      this.isConnected = true;
    });

    this.redisClient.on('disconnect', () => {
      console.log('RedisService Redis Disconnected');
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
