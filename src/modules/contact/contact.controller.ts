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
import { ContactService } from './contact.service';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResponse } from '@/common/types/api-response';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { RespondContactRequestDto } from './dto/respond-contact-request.dto';
import { UpdateAliasDto } from './dto/update-alias.dto';
import {
  QueryContactRequestsDto,
  QueryContactsDto,
} from './dto/query-contact.dto';

@Controller('contacts')
@UseGuards(JwtGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('requests')
  async sendContactRequest(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateContactRequestDto,
  ): Promise<ApiResponse> {
    const request = await this.contactService.sendContactRequest(userId, dto);

    return {
      message: 'Contact request sent successfully',
      data: request,
    };
  }

  @Get('requests/incoming')
  async getIncomingRequests(
    @CurrentUser('id') userId: number,
    @Query() query: QueryContactRequestsDto,
  ): Promise<ApiResponse> {
    const [requests, total] = await this.contactService.getIncomingRequests(
      userId,
      query,
    );

    return {
      message: 'Incoming contact requests retrieved successfully',
      data: requests,
      pagination: {
        total,
        limit: query.limit,
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Get('requests/outgoing')
  async getOutgoingRequests(
    @CurrentUser('id') userId: number,
    @Query() query: QueryContactRequestsDto,
  ): Promise<ApiResponse> {
    const [requests, total] = await this.contactService.getOutgoingRequests(
      userId,
      query,
    );

    return {
      message: 'Outgoing contact requests retrieved successfully',
      data: requests,
      pagination: {
        total,
        limit: query.limit,
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Patch('requests/:id/respond')
  async respondToRequest(
    @CurrentUser('id') userId: number,
    @Param('id') requestId: string,
    @Body() dto: RespondContactRequestDto,
  ): Promise<ApiResponse> {
    const request = await this.contactService.respondToRequest(
      userId,
      requestId,
      dto,
    );

    return {
      message: `Contact request ${dto.status.toLowerCase()} successfully`,
      data: request,
    };
  }

  @Delete('requests/:id')
  async cancelRequest(
    @CurrentUser('id') userId: number,
    @Param('id') requestId: string,
  ): Promise<ApiResponse> {
    await this.contactService.cancelRequest(userId, requestId);

    return {
      message: 'Contact request cancelled successfully',
    };
  }

  @Get()
  async getContacts(
    @CurrentUser('id') userId: number,
    @Query() query: QueryContactsDto,
  ): Promise<ApiResponse> {
    const [contacts, total] = await this.contactService.getContacts(
      userId,
      query,
    );

    return {
      message: 'Contacts retrieved successfully',
      data: contacts,
      pagination: {
        total,
        limit: query.limit,
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Patch(':id/alias')
  async updateAlias(
    @CurrentUser('id') userId: number,
    @Param('id') contactId: string,
    @Body() dto: UpdateAliasDto,
  ): Promise<ApiResponse> {
    const contact = await this.contactService.updateAlias(
      userId,
      contactId,
      dto,
    );

    return {
      message: 'Contact alias updated successfully',
      data: contact,
    };
  }

  @Post(':id/block')
  async blockContact(
    @CurrentUser('id') userId: number,
    @Param('id') contactId: string,
  ): Promise<ApiResponse> {
    const contact = await this.contactService.blockContact(userId, contactId);

    return {
      message: 'Contact blocked successfully',
      data: contact,
    };
  }

  @Post(':id/unblock')
  async unblockContact(
    @CurrentUser('id') userId: number,
    @Param('id') contactId: string,
  ): Promise<ApiResponse> {
    const contact = await this.contactService.unblockContact(userId, contactId);

    return {
      message: 'Contact unblocked successfully',
      data: contact,
    };
  }

  @Delete(':id')
  async removeContact(
    @CurrentUser('id') userId: number,
    @Param('id') contactId: string,
  ): Promise<ApiResponse> {
    await this.contactService.removeContact(userId, contactId);

    return {
      message: 'Contact removed successfully',
    };
  }
}
