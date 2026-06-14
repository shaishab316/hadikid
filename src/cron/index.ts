import { NestFactory } from '@nestjs/core';
import { CronModule } from './cron.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CronModule);
  app.enableShutdownHooks();
}

bootstrap();
