import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '@/common/config/app.config';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from '@/common/strategies/jwt.strategy';
import { AuthRepository } from './repository/auth.repository';
import { AuthService } from './auth.service';
import { UserRepository } from '../user/repositories/user.repository';
import { ChildModule } from '../child/child.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }), // e.g '7d'
        },
      }),
    }),
    UserModule,
    ChildModule,
  ],
  providers: [AuthService, JwtStrategy, AuthRepository, UserRepository],
  controllers: [AuthController],
  exports: [JwtModule, AuthRepository],
})
export class AuthModule {}
