import { UserRepository } from '@/modules/user/repositories/user.repository';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '@/common/config/app.config';

export interface JwtPayload {
  sub: string;
  identifier: string;
  iat: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    readonly config: ConfigService<Env, true>,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          // Extract raw token from query parameter ?token=xxx (no Bearer prefix)
          if (req.query?.token) {
            return req.query.token;
          }
          return null;
        },
      ]),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
    this.logger.debug('JWT strategy initialized');
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`JWT validation for user: ${payload.sub}`);

    const user = await this.userRepository.findByIdWithAuth(+payload.sub);

    if (!user) {
      this.logger.debug(`JWT validation failed: user ${payload.sub} not found`);
      throw new UnauthorizedException('Session Expired. Please login again');
    }

    const { lastPasswordChangeAt } = user.auth ?? {};

    if (lastPasswordChangeAt) {
      const tokenIssuedAt = new Date(payload.iat * 1000);
      if (lastPasswordChangeAt > tokenIssuedAt) {
        this.logger.debug(
          `JWT validation failed: password changed for user ${payload.sub}`,
        );
        throw new UnauthorizedException('Password changed, please login again');
      }
    }

    this.logger.log(`User authenticated: ${user.id}`);
    return user;
  }
}
