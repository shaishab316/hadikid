import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import chalk from 'chalk';
import { Request, Response, NextFunction } from 'express';
import { maskSensitiveFields } from '../utils/maskSensitive';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    if (req.body && Object.keys(req.body).length) {
      this.logger.debug(
        `📨 [${method}] ${originalUrl} -> Raw Body: \n${JSON.stringify(maskSensitiveFields(req.body), null, 2)}`,
      );
    }

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const message = `${chalk.cyan(method)} ${chalk.white(originalUrl)} ${statusCode} ${chalk.yellow('+' + duration + 'ms')}`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
