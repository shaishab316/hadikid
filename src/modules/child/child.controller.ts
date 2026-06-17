import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChildService } from './child.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResponse } from '@/common/types/api-response';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { QueryChildDto } from './dto/query-child.dto';

@Controller('children')
@UseGuards(JwtGuard)
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  @Post()
  async createChild(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateChildDto,
  ): Promise<ApiResponse> {
    const createdChild = await this.childService.createChild(userId, dto);

    return {
      message: 'Child created successfully',
      data: createdChild,
    };
  }

  @Get()
  async getChildren(
    @CurrentUser('id') userId: number,
    @Query() query: QueryChildDto,
  ): Promise<ApiResponse> {
    const [children, total] = await this.childService.getChildren(
      userId,
      query,
    );

    return {
      message: 'Children retrieved successfully',
      data: children,
      pagination: {
        total,
        limit: query.limit,
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Get(':id')
  async getChildById(
    @CurrentUser('id') userId: number,
    @Param('id') childId: string,
  ): Promise<ApiResponse> {
    const child = await this.childService.getChildById(userId, childId);

    return {
      message: 'Child retrieved successfully',
      data: child,
    };
  }

  @Patch(':id')
  async updateChildById(
    @CurrentUser('id') userId: number,
    @Param('id') childId: string,
    @Body() dto: UpdateChildDto,
  ): Promise<ApiResponse> {
    const updatedChild = await this.childService.updateChildById(
      userId,
      childId,
      dto,
    );

    return {
      message: 'Child updated successfully',
      data: updatedChild,
    };
  }

  @Delete(':id')
  async removeChildById(
    @CurrentUser('id') userId: number,
    @Param('id') childId: string,
  ): Promise<ApiResponse> {
    await this.childService.removeChildById(userId, childId);

    return {
      message: 'Child removed successfully',
    };
  }
}
