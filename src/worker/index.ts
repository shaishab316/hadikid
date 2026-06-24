import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { createLogger } from '@/common/config/logger.config';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: createLogger('worker'),
  });

  app.enableShutdownHooks();
}

bootstrap();
