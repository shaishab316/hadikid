import { NestFactory } from '@nestjs/core';
import { CommandModule, CommandService } from 'nestjs-command';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  let exitCode = 0;

  try {
    await app.select(CommandModule).get(CommandService).exec();
  } catch (error) {
    console.error(error);
    exitCode = 1;
  } finally {
    await app.close();
    process.exit(exitCode);
  }
}

bootstrap();
