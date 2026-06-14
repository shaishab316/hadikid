import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import {
  validate as configValidate,
  type Env,
} from '../common/config/app.config';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { RedisModule } from '../infra/redis/redis.module';
import { AuthModule } from '../modules/auth/auth.module';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';
import { MailModule } from '@/infra/mail/mail.module';

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
            labels: { job: 'nestjs-cron', app: 'nest-it' },
          }),
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    MailModule,
    PrismaModule,
    RedisModule,
    AuthModule,
  ],
})
export class CronModule {}
