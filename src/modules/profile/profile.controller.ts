import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { InvalidateCache } from '@/common/decorators/cache.decorator';
import { BasicUserInfoEditDto } from './dto/edit-basic-user-info.dto';

@Controller('profile')
@UseGuards(JwtGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

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
}
