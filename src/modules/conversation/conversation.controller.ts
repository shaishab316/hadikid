import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import {
  QueryConversationDto,
  QueryMessageDto,
} from './dto/query-conversation.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResponse } from '@/common/types/api-response';

@Controller('conversations')
@UseGuards(JwtGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  async createConversation(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateConversationDto,
  ): Promise<ApiResponse> {
    const conversation = await this.conversationService.createConversation(
      userId,
      dto,
    );

    return {
      message: 'Conversation started successfully',
      data: conversation,
    };
  }

  @Get()
  async getConversations(
    @CurrentUser('id') userId: number,
    @Query() query: QueryConversationDto,
  ): Promise<ApiResponse> {
    const { conversations, total } =
      await this.conversationService.getConversations(userId, query);

    return {
      message: 'Conversations retrieved successfully',
      data: conversations,
      pagination: {
        total,
        limit: query.limit,
        page: query.page,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  @Get('support')
  async getSupportConversation(
    @CurrentUser('id') userId: number,
  ): Promise<ApiResponse> {
    const conversation =
      await this.conversationService.getSupportConversation(userId);

    return {
      message: 'Support conversation retrieved successfully',
      data: conversation,
    };
  }

  @Get(':id')
  async getConversation(
    @Param('id') id: string,
    @CurrentUser('id') userId: number,
  ): Promise<ApiResponse> {
    const conversation = await this.conversationService.getConversation(
      id,
      userId,
    );

    return {
      message: 'Conversation details retrieved successfully',
      data: conversation,
    };
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: number,
    @Query() query: QueryMessageDto,
  ): Promise<ApiResponse> {
    const { messages, nextCursor } = await this.conversationService.getMessages(
      conversationId,
      userId,
      query,
    );

    return {
      message: 'Messages retrieved successfully',
      data: messages,
      meta: {
        pagination: {
          limit: query.limit,
          cursor: query.cursor ?? null,
          nextCursor,
        },
      },
    };
  }

  @Post('messages')
  async sendMessage(
    @CurrentUser('id') userId: number,
    @Body() dto: SendMessageDto,
  ): Promise<ApiResponse> {
    const message = await this.conversationService.sendMessage(userId, dto);

    return {
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: number,
  ): Promise<ApiResponse> {
    await this.conversationService.markAsRead(conversationId, userId);

    return {
      message: 'Conversation marked as read',
    };
  }

  @Post(':id/delivered')
  async markDelivered(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: number,
  ): Promise<ApiResponse> {
    await this.conversationService.markDelivered(conversationId, userId);

    return {
      message: 'Messages marked as delivered',
    };
  }
}
