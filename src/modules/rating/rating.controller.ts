import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RatingService } from './rating.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResponse } from '@/common/types/api-response';
import { RateUserDto } from './dto/rate-user.dto';
import { RateCarpoolDto } from './dto/rate-carpool.dto';
import { QueryDefaultDto } from '@/common/dto/sharedDtoSchema';

@Controller('ratings')
@UseGuards(JwtGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post('user')
  async rateUser(
    @CurrentUser('id') userId: number,
    @Body() dto: RateUserDto,
  ): Promise<ApiResponse> {
    const data = await this.ratingService.rateUser(userId, dto);
    return {
      message: 'User rated successfully',
      data,
    };
  }

  @Post('carpool')
  async rateCarpool(
    @CurrentUser('id') userId: number,
    @Body() dto: RateCarpoolDto,
  ): Promise<ApiResponse> {
    const data = await this.ratingService.rateCarpool(userId, dto);
    return {
      message: 'Carpool rated successfully',
      data,
    };
  }

  @Get('given')
  async getMyGiveReview(
    @CurrentUser('id') userId: number,
    @Query() query: QueryDefaultDto,
  ): Promise<ApiResponse> {
    const { reviews, total, breakdown } =
      await this.ratingService.getMyGiveReview(userId, query);
    return {
      message: 'Given reviews retrieved successfully',
      data: reviews,
      pagination: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      meta: {
        ratingBreakdown: breakdown,
      },
    };
  }

  @Get('received')
  async getMyReceiveReview(
    @CurrentUser('id') userId: number,
    @Query() query: QueryDefaultDto,
  ): Promise<ApiResponse> {
    const { reviews, total, breakdown } =
      await this.ratingService.getMyReceiveReview(userId, query);
    return {
      message: 'Received reviews retrieved successfully',
      data: reviews,
      pagination: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      meta: {
        ratingBreakdown: breakdown,
      },
    };
  }
}
