import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '@/common/types/api-response';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthThrottle, RelaxedThrottle } from '@/common/decorators';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @AuthThrottle()
  @HttpCode(200)
  async login(@Body() dto: LoginDto): Promise<ApiResponse> {
    const data = await this.authService.login(dto);

    return {
      message: 'Login successfully',
      data,
    };
  }

  @Post('forgot-password')
  @AuthThrottle()
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);

    return {
      message:
        'If an account with that email exists, you will receive a password reset link.',
    };
  }

  @Post('reset-password')
  @AuthThrottle()
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const code = await this.authService.resetPassword(dto);

    return {
      message: [
        'Otp verified successfully, you can now reset your password',
        'Password reset successfully',
      ][code],
    };
  }

  @Post('refresh-token')
  @AuthThrottle()
  @HttpCode(200)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refreshToken(dto);

    return {
      message: 'Token refreshed successfully',
      data,
    };
  }

  @Get('logout')
  @RelaxedThrottle()
  @UseGuards(JwtGuard)
  async logout(@CurrentUser('id') userId: number) {
    await this.authService.logout(userId);

    return {
      message: 'Logged out successfully',
    };
  }
}
