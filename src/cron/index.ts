import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';
import { createLogger } from '@/common/config/logger.config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CronModule, {
    logger: createLogger('cron'),
  });

  app.enableShutdownHooks();
}

bootstrap();
