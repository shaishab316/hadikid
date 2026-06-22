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
import { CarpoolService } from './carpool.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResponse } from '@/common/types/api-response';
import { CreateCarpoolDto } from './dto/create-carpool.dto';
import { UpdateCarpoolDto } from './dto/update-carpool.dto';
import { InviteMemberDto } from './dto/invite-carpool.dto';
import { UpdateChecklistDto } from './dto/checklist-update.dto';
import { QueryDefaultDto } from '@/common/dto/sharedDtoSchema';

@Controller('carpools')
@UseGuards(JwtGuard)
export class CarpoolController {
  constructor(private readonly carpoolService: CarpoolService) {}

  @Get()
  async getMyCarpools(
    @CurrentUser('id') userId: number,
    @Query() query: QueryDefaultDto,
  ): Promise<ApiResponse> {
    const [data, total] = await this.carpoolService.getMyCarpools(
      userId,
      query,
    );

    return {
      message: 'Carpools retrieved successfully',
      data,
      pagination: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Get('invites')
  async getIncomingInvites(
    @CurrentUser('id') userId: number,
    @Query() query: QueryDefaultDto,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.getIncomingInvites(userId, query);

    const carpool = data[0];
    const total = data[1] as number;

    return {
      message: 'Incoming carpool invitations retrieved successfully',
      data: carpool,
      pagination: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Get('invites/outgoing')
  async getOutgoingInvites(
    @CurrentUser('id') userId: number,
    @Query() query: QueryDefaultDto,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.getOutgoingInvites(userId, query);

    const invites = data[0];
    const total = data[1] as number;

    return {
      message: 'Outgoing carpool invitations retrieved successfully',
      data: invites,
      pagination: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Post('invites/:carpoolId/accept')
  async acceptInvite(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.acceptInvite(userId, carpoolId);

    return {
      message: 'You have joined the carpool',
      data,
    };
  }

  @Delete('invites/:carpoolId')
  async declineInvite(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
  ): Promise<ApiResponse> {
    await this.carpoolService.declineInvite(userId, carpoolId);

    return {
      message: 'Invitation declined',
    };
  }

  @Delete('invites/:carpoolId/:invitedUserId')
  async withdrawInvite(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
    @Param('invitedUserId') invitedUserId: string,
  ): Promise<ApiResponse> {
    await this.carpoolService.withdrawInvite(userId, carpoolId, +invitedUserId);

    return {
      message: 'Invitation withdrawn successfully',
    };
  }

  @Get(':carpoolId')
  async getCarpoolDetails(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.getCarpoolDetails(userId, carpoolId);

    return {
      message: 'Carpool details retrieved successfully',
      data,
    };
  }

  @Post()
  async createCarpool(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateCarpoolDto,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.createCarpool(userId, dto);

    return {
      message: 'Carpool created successfully',
      data,
    };
  }

  @Patch(':carpoolId')
  async updateCarpool(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
    @Body() dto: UpdateCarpoolDto,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.updateCarpool(
      userId,
      carpoolId,
      dto,
    );

    return {
      message: 'Carpool updated successfully',
      data,
    };
  }

  @Delete(':carpoolId')
  async deleteCarpool(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
  ): Promise<ApiResponse> {
    await this.carpoolService.deleteCarpool(userId, carpoolId);

    return {
      message: 'Carpool deleted successfully',
    };
  }

  @Patch(':carpoolId/driver')
  async assignDriver(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.assignDriver(userId, carpoolId);

    return {
      message: 'You have been assigned as driver',
      data,
    };
  }

  @Delete(':carpoolId/driver')
  async resignDriver(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
  ): Promise<ApiResponse> {
    await this.carpoolService.resignAsDriver(userId, carpoolId);

    return {
      message: 'You have resigned as driver',
    };
  }

  @Post(':carpoolId/invites')
  async inviteMember(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
    @Body() dto: InviteMemberDto,
  ): Promise<ApiResponse> {
    await this.carpoolService.inviteMember(userId, carpoolId, dto);

    return {
      message: 'Invitation sent successfully',
    };
  }

  @Delete(':carpoolId/members/me')
  async leaveCarpool(
    @CurrentUser('id') userId: number,
    @Param('carpoolId') carpoolId: string,
  ): Promise<ApiResponse> {
    await this.carpoolService.leaveCarpool(userId, carpoolId);

    return {
      message: 'You have left the carpool',
    };
  }

  @Post('rounds/:roundId/start')
  async startRound(
    @CurrentUser('id') userId: number,
    @Param('roundId') roundId: string,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.startRound(userId, roundId);

    return {
      message: 'Round started',
      data,
    };
  }

  @Post('rounds/:roundId/complete')
  async completeRound(
    @CurrentUser('id') userId: number,
    @Param('roundId') roundId: string,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.completeRound(userId, roundId);

    return {
      message: 'Round completed',
      data,
    };
  }

  @Patch('rounds/:roundId/pickup-checklist')
  async updatePickupChecklist(
    @CurrentUser('id') userId: number,
    @Param('roundId') roundId: string,
    @Body() dto: UpdateChecklistDto,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.updatePickupChecklist(
      userId,
      roundId,
      dto,
    );

    return {
      message: 'Pickup checklist updated',
      data,
    };
  }

  @Patch('rounds/:roundId/dropoff-checklist')
  async updateDropoffChecklist(
    @CurrentUser('id') userId: number,
    @Param('roundId') roundId: string,
    @Body() dto: UpdateChecklistDto,
  ): Promise<ApiResponse> {
    const data = await this.carpoolService.updateDropoffChecklist(
      userId,
      roundId,
      dto,
    );

    return {
      message: 'Drop-off checklist updated',
      data,
    };
  }
}
