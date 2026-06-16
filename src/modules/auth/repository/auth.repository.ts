import { compareNonce, hashNonce, hashPassword } from '@/common/helpers';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { RedisService } from '@/infra/redis/redis.service';
import { Injectable, Logger } from '@nestjs/common';
import type { OtpReason } from '../auth.constant';

@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async storeOtp(
    key: string,
    otp: string,
    reason: OtpReason,
    ttl: number = 5 * 60, // default to 5 minutes in seconds
  ) {
    const otpHash = hashNonce(otp); // Hash the OTP

    await this.redis.set((ctx) => ctx.OTP(key, reason), otpHash, ttl);
    this.logger.debug(`OTP stored for ${key} (${reason})`);
  }

  async deleteOtp(key: string, reason: OtpReason) {
    await this.redis.del((ctx) => ctx.OTP(key, reason));
  }

  async verifyOtp(
    key: string,
    otp: string,
    reason: OtpReason,
  ): Promise<boolean> {
    // TODO: delete in production
    if (otp === '123456' && process.env.NODE_ENV === 'development') {
      this.logger.debug(`Test OTP verified for ${key} (${reason})`);
      return true;
    }

    const otpHash = await this.redis.get<string>((ctx) => ctx.OTP(key, reason));

    if (!otpHash) {
      return false; // No OTP found or expired
    }

    return compareNonce(otp, otpHash);
  }

  async storeRefreshToken(userId: string, token: string, ttl: number) {
    await this.redis.hSet(
      (ctx) => ctx.TOKEN.REFRESH(userId),
      hashNonce(token),
      ttl,
    );
    this.logger.debug(`Refresh token stored for user ${userId}`);
  }

  async checkRefreshToken(userId: string, token: string) {
    return await this.redis.hIsMember(
      (ctx) => ctx.TOKEN.REFRESH(userId),
      hashNonce(token),
    );
  }

  async revokeRefreshToken(userId: string, token: string) {
    await this.redis.hDel((ctx) => ctx.TOKEN.REFRESH(userId), hashNonce(token));
  }

  async revokeAllRefreshTokens(userId: string) {
    await this.redis.del((ctx) => ctx.TOKEN.REFRESH(userId));
  }

  async resetPassword(userId: number, newPassword: string) {
    await this.prisma.authentication.update({
      where: { userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        lastPasswordChangeAt: new Date(),
      },
    });
    this.logger.debug(`Password updated for user ${userId}`);
  }
}
