import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisService } from '../../infra/redis/redis.service';
import { SkipThrottle } from '@/common/decorators/throttle.decorator';
import * as path from 'node:path';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private healthIndicatorService: HealthIndicatorService,
    private redisService: RedisService,
  ) {}

  @Get()
  @SkipThrottle()
  @HealthCheck()
  async check() {
    try {
      return await this.health.check([
        () => this.prismaHealth.isHealthy('database'),
        async () => {
          const indicator = this.healthIndicatorService.check('redis');
          const pong = await this.redisService.getClient().ping();
          return pong === 'PONG'
            ? indicator.up()
            : indicator.down({ message: 'ping failed' });
        },
        () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
        () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
        () =>
          this.disk.checkStorage('disk', {
            path: path.parse(process.cwd()).root,
            thresholdPercent: 0.99,
          }),
      ]);
    } catch (error: any) {
      if (error && typeof error.getResponse === 'function') {
        return error.getResponse();
      }
      throw error;
    }
  }
}
