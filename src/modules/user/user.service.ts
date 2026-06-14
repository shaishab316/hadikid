import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CloudinaryService } from '@/infra/upload/cloudinary.service';
import { UserRegisterDto } from './dto/register.user.dto';
import { comparePassword, generateOtp, hashPassword } from '@/common/helpers';
import { UserRole, UserStatus } from '@prisma/client';
import { AccountVerifyOtpDto } from './dto/account-verify-otp.dto';
import { MailService } from '@/infra/mail/mail.service';
import { AuthRepository } from '../auth/repository/auth.repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authRepository: AuthRepository,
    private readonly cloudinary: CloudinaryService,
    private readonly mail: MailService,
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
    const { email, name, password } = dto;
    this.logger.debug(`User registration attempt for ${email}`);

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException(
        'A account with this email already exists, please log in instead',
      );
    }

    await this.userRepository.createTemporary(dto.email, {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: UserRole.USER,
    });

    const otp = generateOtp(6);

    await this.authRepository.storeOtp(email, otp, 'email_verification');

    this.mail.sendMail({
      email,
      subject: 'Verify your account',
      body: `Your OTP for account verification is: ${otp}`,
    });
    this.logger.debug(`Verification OTP sent to ${email}`);
  }

  async accountVerify(dto: AccountVerifyOtpDto) {
    const { email, otp } = dto;
    this.logger.debug(`Account verification attempt for ${email}`);

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException(
        'Account already verified, please log in instead',
      );
    }

    const isValid = await this.authRepository.verifyOtp(
      email,
      otp,
      'email_verification',
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.authRepository.deleteOtp(email, 'email_verification');

    const tempUser = await this.userRepository.getTemporary(email);

    if (!tempUser) {
      throw new NotFoundException(
        'Something went wrong, please try registering again',
      );
    }

    await this.userRepository.deleteTemporary(email);

    switch (tempUser.role) {
      case UserRole.USER: {
        const { email, name, passwordHash, role } = tempUser;

        await this.userRepository.create({
          name,
          email,

          isEmailVerified: true,
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
        });

        this.logger.log(`User account verified and created: ${email}`);
        break;
      }
    }
  }
}
