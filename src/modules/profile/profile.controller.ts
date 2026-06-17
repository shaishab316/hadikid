import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { InvalidateCache } from '@/common/decorators/cache.decorator';
import { BasicUserInfoEditDto } from './dto/edit-basic-user-info.dto';
import { ApiResponse } from '@/common/types/api-response';
import { ContactService } from '../contact/contact.service';

@Controller('profile')
@UseGuards(JwtGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly contactService: ContactService,
  ) {}

  @Patch()
  @InvalidateCache('user:me::user.id')
  async basicUserInfoEditById(
    @CurrentUser('id') userId: number,
    @Body() dto: BasicUserInfoEditDto,
  ) {
    await this.profileService.basicUserInfoEditById(userId, dto);

    return {
      message: 'Basic user info edited successfully',
    };
  }

  @Get(':id')
  async getUserProfileById(
    @CurrentUser('id') currentUserId: number,
    @Param('id', ParseIntPipe) targetUserId: number,
  ): Promise<ApiResponse> {
    const profile = await this.profileService.getUserProfileById(
      currentUserId,
      targetUserId,
    );

    return {
      message: 'User profile retrieved successfully',
      data: profile,
    };
  }

  @Post(':userId/block')
  async blockUser(
    @CurrentUser('id') userId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ): Promise<ApiResponse> {
    const contact = await this.contactService.blockUser(userId, targetUserId);

    return {
      message: 'User blocked successfully',
      data: contact,
    };
  }

  @Post(':userId/unblock')
  async unblockUser(
    @CurrentUser('id') userId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ): Promise<ApiResponse> {
    const contact = await this.contactService.unblockUser(userId, targetUserId);

    return {
      message: 'User unblocked successfully',
      data: contact,
    };
  }
}
