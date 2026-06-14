import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import chalk from 'chalk';
import compression from 'compression';
import { NextFunction, Request, Response } from 'express';
import express from 'express';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { setupApiDocs } from './common/config/api-docs.config';
import type { Env } from './common/config/app.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { BasicAuthMiddleware } from './common/middlewares/basic-auth.middleware';
import path from 'node:path';
import { ParseJsonBodyInterceptor } from './common/interceptors/parse-json-body.interceptor';
import { RedisIoAdapter } from './infra/socket/redis-io.adapter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('🚀 Starting application bootstrap...');

  const isDev = process.env.NODE_ENV === 'development';

  const winstonLogger = WinstonModule.createLogger({
    level: isDev ? 'debug' : 'info',
    transports: [
      new winston.transports.Console({
        level: isDev ? 'debug' : 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
      ...(!isDev
        ? [
            new LokiTransport({
              host: process.env.LOKI_URL!,
              labels: { job: 'nestjs', app: 'hadikid' },
            }),
          ]
        : []),
    ],
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: winstonLogger,
  });

  app.set('trust proxy', 'loopback');

  const config = app.get(ConfigService<Env, true>);
  logger.log('Configuration loaded successfully');

  // security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/docs') ||
      req.path.startsWith('/queues') ||
      req.path === '/'
    ) {
      helmet({ contentSecurityPolicy: false })(req, res, next);
    } else {
      helmet()(req, res, next);
    }
  });

  // cors
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // compression + body parsing
  app.use(compression());
  app.use(express.json());

  app.useStaticAssets(path.join(process.cwd(), 'public'), { maxAge: '1d' });

  // global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'queues', 'docs', 'docs-json', 'docs-yaml'],
  });

  // basic auth for docs + queues
  const docsAuth = new BasicAuthMiddleware(
    config.get('DOCS_USERNAME', { infer: true }),
    config.get('DOCS_PASSWORD', { infer: true }),
  );
  const queuesAuth = new BasicAuthMiddleware(
    config.get('QUEUES_USERNAME', { infer: true }),
    config.get('QUEUES_PASSWORD', { infer: true }),
  );
  app.use('/docs', (req: Request, res: Response, next: NextFunction) =>
    docsAuth.use(req, res, next),
  );
  app.use('/docs-json', (req: Request, res: Response, next: NextFunction) =>
    docsAuth.use(req, res, next),
  );
  app.use('/docs-yaml', (req: Request, res: Response, next: NextFunction) =>
    docsAuth.use(req, res, next),
  );
  app.use('/queues', (req: Request, res: Response, next: NextFunction) =>
    queuesAuth.use(req, res, next),
  );

  // global pipes
  app.useGlobalPipes(new ZodValidationPipe());

  // global interceptors
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    app.get(CacheInterceptor),
    new ParseJsonBodyInterceptor(),
  );

  // global exception filter
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new GlobalExceptionFilter({ httpAdapter } as HttpAdapterHost),
  );

  // api docs
  setupApiDocs(app);

  // shutdown hooks
  app.enableShutdownHooks();

  // init — must be before redis adapter
  await app.init();

  // redis socket.io adapter — after init so RedisService is ready
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const appUrl = await app.getUrl();
  logger.log(`✨ Application is running on: ${chalk.blue(appUrl)}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Failed to start application', err);
  console.error(err);
  process.exit(1);
});
