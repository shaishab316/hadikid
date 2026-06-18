import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CarpoolService } from './carpool.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResponse } from '@/common/types/api-response';
import { CreateCarpoolDto } from './dto/create-carpool.dto';

@Controller('carpools')
@UseGuards(JwtGuard)
export class CarpoolController {
  constructor(private readonly carpoolService: CarpoolService) {}

  @Post()
  async createCarpool(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateCarpoolDto,
  ): Promise<ApiResponse> {
    const createdCarpool = await this.carpoolService.createCarpool(userId, dto);

    return {
      message: 'Carpool created successfully',
      data: createdCarpool,
    };
  }
}
