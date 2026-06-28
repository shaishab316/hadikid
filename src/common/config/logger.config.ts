import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

export function createLogger(job: string) {
  const isDev = process.env.NODE_ENV === 'development';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: isDev ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ];

  if (!isDev) {
    const loki = new LokiTransport({
      host: process.env.LOKI_URL!,
      labels: { job, app: 'hadikid' },
      json: true,

      onConnectionError: (err) => {
        console.error('❌ Loki connection error:', err);
      },
    });

    loki.on('error', (err) => {
      console.error('❌ Loki transport error:', err);
    });

    transports.push(loki);
  }

  return WinstonModule.createLogger({
    level: isDev ? 'debug' : 'info',
    transports,
  });
}
