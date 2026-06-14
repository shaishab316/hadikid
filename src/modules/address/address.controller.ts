import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CreateAddressDto } from './dto/create-address.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResponse } from '@/common/types/api-response';
import { QueryAddressDto } from './dto/query-address.dto';
import { AddressService } from './address.service';
import {
  CacheKey,
  CacheTTL,
  InvalidateCache,
} from '@/common/decorators/cache.decorator';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @UseGuards(JwtGuard)
  @CacheKey('address::user.id')
  @CacheTTL(200)
  async queryAddress(
    @CurrentUser('id') userId: number,
    @Query() query: QueryAddressDto,
  ): Promise<ApiResponse> {
    const [data, total] = await this.addressService.queryAddress(userId, query);

    return {
      message: 'Address query successfully',
      data: data.map(({ isPrimary, location }) => ({
        ...location,
        isPrimary,
        userId,
      })),
      pagination: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Post()
  @UseGuards(JwtGuard)
  @InvalidateCache('address::user.id')
  async createAddress(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateAddressDto,
  ): Promise<ApiResponse> {
    const { isPrimary, location } = await this.addressService.createAddress(
      userId,
      dto,
    );

    return {
      message: 'Address created successfully',
      data: {
        ...location,
        isPrimary,
        userId,
      },
    };
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @InvalidateCache('address::user.id')
  async deleteAddress(
    @CurrentUser('id') userId: number,
    @Param('id') addressId: string,
  ): Promise<ApiResponse> {
    const data = await this.addressService.deleteAddress(userId, addressId);

    return {
      message: 'Address deleted successfully',
      data,
    };
  }
}
