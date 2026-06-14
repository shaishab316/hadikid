import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ChangePasswordDto } from './dto/change-password.dto';

import { CacheKey, CacheTTL } from '@/common/decorators/cache.decorator';
import { StrictThrottle } from '@/common/decorators/throttle.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { UserRegisterDto } from './dto/register.user.dto';
import { ApiResponse } from '@/common/types/api-response';
import { AccountVerifyOtpDto } from './dto/account-verify-otp.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @CacheKey('user:me::user.id')
  @CacheTTL(300)
  @UseGuards(JwtGuard)
  async getMe(@CurrentUser('id') userId: number) {
    const user = await this.userService.getMe(userId);

    return {
      message: `Welcome back, ${user.name}!`,
      data: user,
    };
  }

  @Post('change-password')
  @StrictThrottle()
  @UseGuards(JwtGuard)
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    const code = await this.userService.changePassword(userId, dto);

    return {
      message: [
        'Password is already up to date.',
        'Password set successfully.',
        'Password change successfully.',
      ][code],
    };
  }

  @Post('register-user')
  @StrictThrottle()
  async registerUser(@Body() dto: UserRegisterDto): Promise<ApiResponse> {
    await this.userService.registerUser(dto);

    return {
      message: 'User registered successfully',
    };
  }

  @Post('account-verify')
  @StrictThrottle()
  async accountVerify(@Body() dto: AccountVerifyOtpDto): Promise<ApiResponse> {
    await this.userService.accountVerify(dto);

    return {
      message: 'Account verified successfully',
    };
  }
}
