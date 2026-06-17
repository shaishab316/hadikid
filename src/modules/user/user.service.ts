import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRegisterDto } from './dto/register.user.dto';
import { comparePassword, generateOtp, hashPassword } from '@/common/helpers';
import { AccountVerifyOtpDto } from './dto/account-verify-otp.dto';
import { ResendAccountVerifyOtpDto } from './dto/resend-account-verify-otp.dto';
import { AuthRepository } from '../auth/repository/auth.repository';
import { UserRole, UserStatus } from './user.constant';
import { OTP_LENGTH, OtpReason } from '../auth/auth.constant';
import { MailService } from '@/infra/mail/mail.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
    private readonly mailService: MailService,
  ) {}

  async getMe(userId: number) {
    this.logger.debug(`Fetching user profile: ${userId}`);

    const user = await this.userRepository.getMe(userId);

    if (!user) {
      throw new NotFoundException(
        'Unable to fetch user profile, please contact support',
      );
    }

    return user;
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    this.logger.debug(`Password change attempt for user: ${userId}`);

    const { currentPassword, newPassword } = dto;

    const user = await this.userRepository.findByIdWithAuth(userId);

    if (!user) {
      throw new NotFoundException(
        'Unable to change password, please contact support',
      );
    }

    if (!user.auth?.passwordHash) {
      await this.authRepository.resetPassword(userId, newPassword);

      return 2; // set
    }

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.auth.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    if (currentPassword === newPassword) {
      return 0; // skipped
    }

    await this.authRepository.resetPassword(userId, newPassword);

    this.logger.log(`Password changed successfully for user ${userId}`);

    return 1; // changed
  }

  async registerUser(dto: UserRegisterDto) {
    const { phone, firstName, lastName, password, email } = dto;
    this.logger.debug(`User registration attempt for ${phone}`);

    const existingUser = await this.userRepository.findByPhone(phone);

    if (existingUser) {
      throw new BadRequestException(
        'A account with this phone number already exists, please log in instead',
      );
    }

    await this.userRepository.createTemporary(dto.phone, {
      name: `${firstName} ${lastName}`,
      phone,
      passwordHash: await hashPassword(password),
      role: UserRole.USER,
      email,
    });

    const otp = generateOtp(OTP_LENGTH);

    await this.authRepository.storeOtp(
      phone,
      otp,
      OtpReason.PHONE_VERIFICATION,
    );

    // this.mail.sendMail({
    //   email,
    //   subject: 'Verify your account',
    //   body: `Your OTP for account verification is: ${otp}`,
    // });

    // TODO: send otp via sms

    this.logger.debug(`Verification OTP sent to ${phone}`);
  }

  async accountVerify(dto: AccountVerifyOtpDto) {
    const { phone, otp } = dto;
    this.logger.debug(`Account verification attempt for ${phone}`);

    const existingUser = await this.userRepository.findByPhone(phone);

    if (existingUser) {
      throw new BadRequestException(
        'Account already verified, please log in instead',
      );
    }

    const isValid = await this.authRepository.verifyOtp(
      phone,
      otp,
      OtpReason.PHONE_VERIFICATION,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.authRepository.deleteOtp(phone, OtpReason.PHONE_VERIFICATION);

    const tempUser = await this.userRepository.getTemporary(phone);

    if (!tempUser) {
      throw new NotFoundException(
        'Something went wrong, please try registering again',
      );
    }

    await this.userRepository.deleteTemporary(phone);

    switch (tempUser.role) {
      case UserRole.USER: {
        const { phone, name, passwordHash, role, email } = tempUser;

        await this.userRepository.create({
          name,
          phone,

          isPhoneVerified: true,
          status: UserStatus.ACTIVE,

          auth: {
            create: {
              passwordHash,
              lastLoginAt: new Date(),
              lastPasswordChangeAt: new Date(),
              canLogin: true,
            },
          },

          roles: {
            create: {
              role,
            },
          },

          publicEmail: email,
        });

        if (email) {
          await this.mailService.sendMail({
            email,
            subject: 'Account Verified - HadiKid',
            body: `Hello ${name}! Your account has been verified successfully.`,
          });
        }

        this.logger.log(`User account verified and created: ${phone}`);
        break;
      }
    }
  }

  async resendAccountVerifyOtp(dto: ResendAccountVerifyOtpDto) {
    const { phone } = dto;
    this.logger.debug(`Account verification OTP resend attempt for ${phone}`);

    const existingUser = await this.userRepository.findByPhone(phone);

    if (existingUser) {
      throw new BadRequestException(
        'Account already verified, please log in instead',
      );
    }

    const tempUser = await this.userRepository.getTemporary(phone);

    if (!tempUser) {
      throw new BadRequestException(
        'No pending registration found for this phone number, please register first',
      );
    }

    const otp = generateOtp(OTP_LENGTH);

    await this.authRepository.storeOtp(
      phone,
      otp,
      OtpReason.PHONE_VERIFICATION,
    );

    // TODO: send otp via sms

    this.logger.debug(`Verification OTP resent to ${phone}`);
  }

  async deleteAccount(userId: number) {
    this.logger.log(`Deleting account for user ${userId}`);
    await this.authRepository.revokeAllRefreshTokens(userId.toString());
    await this.userRepository.delete(userId);
  }
}
