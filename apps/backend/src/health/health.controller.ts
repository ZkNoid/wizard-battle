import { Controller, Get, Post } from '@nestjs/common';
import { RedisHealthService, HealthStatus } from './redis-health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redisHealthService: RedisHealthService) {}

  @Get()
  async getHealth(): Promise<HealthStatus> {
    return await this.redisHealthService.checkHealth();
  }

  @Get('stats')
  async getStats() {
    return await this.redisHealthService.getDetailedStats();
  }

  @Post('cleanup')
  async cleanupOrphanedData() {
    return await this.redisHealthService.cleanupOrphanedData();
  }
}
