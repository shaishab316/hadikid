import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './repository/auth.repository';
import { LoginDto } from './dto/login.dto';
import { UserRepository } from '../user/repositories/user.repository';
import { comparePassword, generateNonce, generateOtp } from '@/common/helpers';
import { JwtService } from '@nestjs/jwt';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '@prisma/client';
import { resolveLocation } from '../address/address.constant';
import { NotificationService } from '@/infra/notification/notification.service';
import { UserRole, UserStatus } from '../user/user.constant';
import { OtpReason } from './auth.constant';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  async login(dto: LoginDto) {
    const { phone, password, address } = dto;
    this.logger.debug(`Login attempt for ${phone}`);

    const user = await this.userRepository.findByPhoneWithAuth(phone);

    if (!user) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    if (!user.auth) {
      throw new UnauthorizedException(
        'This account no longer able to login, please contact support',
      );
    }

    if (!user.auth.passwordHash) {
      throw new UnauthorizedException(
        'Password not set for this account, please contact support',
      );
    }

    const isPasswordValid = await comparePassword(
      password,
      user.auth.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Your account is currently inactive, please contact support',
      );
    }

    const accessToken = this.genAccessToken(
      user,
      user.roles.map((r) => r.role as UserRole),
    );

    const refreshToken = generateNonce(64);

    await this.authRepository.storeRefreshToken(
      user.id.toString(),
      refreshToken,
      30 * 24 * 60 * 60,
    ); //? 30 days in seconds

    this.logger.log(`User ${user.id} logged in successfully`);

    if (address) {
      await this.userRepository.update(user.id, {
        location: {
          create: resolveLocation(address),
        },
      });
    }

    await this.notificationService.sendNotification({
      userIds: [user.id],
      title: 'Login Notification',
      message: 'You have successfully logged in to your account',
      type: 'INFO',
    });

    return {
      user: await this.userRepository.getMe(user.id),
      tokens: {
        accessToken,
        accessTokenExpiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), //? 7 days in seconds

        refreshToken,
        refreshTokenExpiresIn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), //? 30 days in seconds
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { phone } = dto;
    this.logger.debug(`Forgot password request for ${phone}`);

    const user = await this.userRepository.findByPhoneWithAuth(phone);

    if (!user) {
      return;
    }

    const otp = generateOtp(6);

    await this.authRepository.storeOtp(phone, otp, OtpReason.PASSWORD_RESET);
    this.logger.debug(`Password reset OTP stored for ${phone}`);

    // await this.mail.sendMail(
    //   {
    //     email,
    //     subject: 'Your password reset code',
    //     body: `Your password reset code is: ${otp}`,
    //   },
    //   {
    //     attempts: 3,
    //     backoff: { type: 'exponential', delay: 5000 },
    //     removeOnComplete: true,
    //     removeOnFail: { age: 15 * 60 }, //? 15 minutes
    //   },
    // );

    // TODO: send phone otp sms
    this.logger.log(`Password reset email queued for ${phone}`);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { phone, otp, newPassword } = dto;
    this.logger.debug(`Password reset attempt for ${phone}`);

    const isValidOtp = await this.authRepository.verifyOtp(
      phone,
      otp,
      OtpReason.PASSWORD_RESET,
    );

    if (!isValidOtp) {
      throw new UnauthorizedException(
        'Invalid or expired OTP, please try again',
      );
    }

    if (!newPassword) {
      return 0; // skip
    }

    const user = await this.userRepository.findByPhoneWithAuth(phone);

    if (!user) {
      throw new UnauthorizedException(
        'Password reset not available for this account, please contact support',
      );
    }

    await this.authRepository.resetPassword(user.id, newPassword);

    await this.authRepository.deleteOtp(phone, OtpReason.PASSWORD_RESET); // revoke use once

    await this.notificationService.sendNotification({
      userIds: [user.id],
      title: 'Password Reset Notification',
      message: 'You have successfully reset your password',
      type: 'INFO',
    });

    this.logger.log(`Password reset successfully for user ${user.id}`);

    return 1;
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken, userId } = dto;
    this.logger.debug(`Token refresh attempt for user ${userId}`);

    const isValid = await this.authRepository.checkRefreshToken(
      userId.toString(),
      refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Session expired, please login again');
    }

    await this.authRepository.revokeRefreshToken(
      userId.toString(),
      refreshToken,
    ); // revoke use once

    const user = await this.userRepository.findByIdWithAuth(+userId);

    if (!user) {
      throw new UnauthorizedException('Session expired, please login again');
    }

    const accessToken = this.genAccessToken(
      user,
      user.roles.map((r) => r.role as UserRole),
    );

    const newRefreshToken = generateNonce(64);

    await this.authRepository.storeRefreshToken(
      user.id.toString(),
      newRefreshToken,
      30 * 24 * 60 * 60,
    ); //? 30 days in seconds

    this.logger.debug(`Token refreshed for user ${user.id}`);

    return {
      tokens: {
        accessToken,
        accessTokenExpiresIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), //? 7 days in seconds
        refreshToken: newRefreshToken,
        refreshTokenExpiresIn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), //? 30 days in seconds
      },
    };
  }

  async logout(userId: number) {
    await this.authRepository.revokeAllRefreshTokens(userId.toString());
    this.logger.log(`User ${userId} logged out`);
  }

  genAccessToken(user: User, roles: UserRole[]) {
    return this.jwtService.sign(
      {
        roles,
      },
      {
        subject: user.id.toString(),
        jwtid: crypto.randomUUID(),
      },
    );
  }
}
