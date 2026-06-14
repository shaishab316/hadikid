import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Basic HTTP Authentication middleware for protecting sensitive admin endpoints
 * Expects credentials in format: Authorization: Basic base64(username:password)
 */
@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  private readonly credentials: string;

  constructor(username: string, password: string) {
    // Pre-compute base64 credentials for comparison
    this.credentials = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
  }

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Protected Area"');
      throw new UnauthorizedException(
        'Authentication required. Please provide valid credentials.',
      );
    }

    const credentials = authHeader.slice(6); // Remove 'Basic ' prefix

    if (credentials !== this.credentials) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Protected Area"');
      throw new UnauthorizedException('Invalid credentials');
    }

    next();
  }
}
