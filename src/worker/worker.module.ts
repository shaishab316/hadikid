import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { WinstonModule } from 'nest-winston';
import {
  validate as configValidate,
  type Env,
} from '../common/config/app.config';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';
import { MailWorkerModule } from '@/infra/mail/mail-worker.module';
import { NotificationWorkerModule } from '@/infra/notification/notification-worker.module';
import { CarpoolWorkerModule } from '@/modules/carpool/carpool-worker.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: configValidate }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
          new LokiTransport({
            host: config.get('LOKI_URL', { infer: true }),
            labels: { job: 'nestjs-worker', app: 'hadikid' },
          }),
        ],
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: { url: config.get('REDIS_URL', { infer: true }) },
      }),
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    MailWorkerModule,
    NotificationWorkerModule,
    CarpoolWorkerModule,
  ],
})
export class WorkerModule {}
