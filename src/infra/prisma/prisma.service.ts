import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Env } from '@/common/config/app.config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  static slowQueryThreshold = 1000; // ms

  constructor(config: ConfigService<Env, true>) {
    const pool = new Pool({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      max: 10,
      min: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      maxUses: 7500,
    });

    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log:
        config.get('NODE_ENV', { infer: true }) === 'production'
          ? [{ emit: 'event', level: 'error' }]
          : [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ],
    });
  }

  async onModuleInit() {
    this.$on('query' as never, (e: any) => {
      if (e.duration > PrismaService.slowQueryThreshold) {
        this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
      // fast queries = silence
    });

    this.$on('error' as never, (e: any) => {
      this.logger.error(`Prisma error: ${e.message}`);
    });

    this.$on('warn' as never, (e: any) => {
      this.logger.warn(`Prisma warn: ${e.message}`);
    });

    await this.$connect();
    await this.$queryRaw`SELECT 1`;
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
