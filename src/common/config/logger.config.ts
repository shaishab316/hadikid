import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

export function createLogger(job: string) {
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
              labels: { job, app: 'hadikid' },
            }),
          ]
        : []),
    ],
  });

  return winstonLogger;
}
