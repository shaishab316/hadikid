import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationRepository } from './repositories/conversation.repository';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import {
  QueryConversationDto,
  QueryMessageDto,
} from './dto/query-conversation.dto';
import { SocketGateway } from '@/infra/socket/socket.gateway';
import { UserRepository } from '../user/repositories/user.repository';

@Injectable()
export class ConversationService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly socketGateway: SocketGateway,
    private readonly userRepo: UserRepository,
  ) {}

  async createConversation(userId: number, dto: CreateConversationDto) {
    const { name, isGroup, participantIds } = dto;

    const uniqueParticipantIds = Array.from(
      new Set(participantIds.filter((id) => id !== userId)),
    );

    if (uniqueParticipantIds.length === 0) {
      throw new BadRequestException(
        'At least one other participant is required',
      );
    }

    // Verify all other participants exist with a single count query
    const existCount =
      await this.conversationRepo.countUsersByIds(uniqueParticipantIds);
    if (existCount !== uniqueParticipantIds.length) {
      throw new NotFoundException('One or more participants not found');
    }

    let conversation;

    if (!isGroup) {
      if (uniqueParticipantIds.length !== 1) {
        throw new BadRequestException(
          'Direct message requires exactly one recipient',
        );
      }
      const recipientId = uniqueParticipantIds[0];

      const existing = await this.conversationRepo.findDirectConversation(
        userId,
        recipientId,
      );
      if (existing) return this.mapConversation(existing, userId);

      conversation = await this.conversationRepo.createConversation({
        isGroup: false,
        participants: [
          { userId, role: 'OWNER' as const },
          { userId: recipientId, role: 'MEMBER' as const },
        ],
      });
    } else {
      if (!name) {
        throw new BadRequestException('Group name is required');
      }

      conversation = await this.conversationRepo.createConversation({
        name,
        isGroup: true,
        participants: [
          { userId, role: 'OWNER' as const },
          ...uniqueParticipantIds.map((id) => ({
            userId: id,
            role: 'MEMBER' as const,
          })),
        ],
      });
    }

    uniqueParticipantIds.forEach((pId) => {
      this.socketGateway.emit(
        `user:${pId}`,
        'conversation_created',
        this.mapConversation(conversation, pId),
      );
    });

    return this.mapConversation(conversation, userId);
  }

  async getConversations(userId: number, query: QueryConversationDto) {
    const { limit, page } = query;
    const [conversations, total] =
      await this.conversationRepo.findUserConversations(userId, limit, page);

    const mapped = conversations.map((c) => this.mapConversation(c, userId));
    return { conversations: mapped, total };
  }

  async getConversation(id: string, userId: number) {
    const conversation = await this.conversationRepo.findById(id, userId);
    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you are not a participant',
      );
    }
    return this.mapConversation(
      {
        ...conversation,
        participants: conversation.participants.map(({ user, role }: any) => ({
          ...user,
          role,
        })),
      },
      userId,
    );
  }

  async getMessages(
    conversationId: string,
    userId: number,
    query: QueryMessageDto,
  ) {
    await this.getConversation(conversationId, userId);

    const { limit, cursor } = query;
    const [messages, nextCursor] = await this.conversationRepo.findMessages(
      conversationId,
      limit,
      cursor,
    );

    return { messages, nextCursor };
  }

  async sendMessage(userId: number, dto: SendMessageDto) {
    const { conversationId, recipientId, content, attachmentIds } = dto;

    let targetConversationId = conversationId;

    if (!targetConversationId) {
      if (!recipientId) {
        throw new BadRequestException(
          'Either conversationId or recipientId must be provided',
        );
      }

      if (recipientId === userId) {
        // Allow self-chats, but skip user checks or handle it
      } else {
        // Verify recipient exists
        const recipient = await this.userRepo.findById(recipientId);
        if (!recipient) {
          throw new NotFoundException(
            `Recipient with ID ${recipientId} not found`,
          );
        }
      }

      // Resolve direct conversation
      let conversation = await this.conversationRepo.findDirectConversation(
        userId,
        recipientId,
      );

      if (!conversation) {
        conversation = await this.conversationRepo.createConversation({
          isGroup: false,
          participants: [
            { userId, role: 'OWNER' as const },
            ...(userId !== recipientId
              ? [{ userId: recipientId, role: 'MEMBER' as const }]
              : []),
          ],
        });

        // Notify recipient of new conversation creation
        if (userId !== recipientId) {
          this.socketGateway.emit(
            `user:${recipientId}`,
            'conversation_created',
            this.mapConversation(conversation, recipientId),
          );
        }
      }

      targetConversationId = conversation.id;
    }

    const conversation = await this.getConversation(
      targetConversationId,
      userId,
    );

    const message = await this.conversationRepo.createMessage(
      targetConversationId,
      userId,
      content,
      attachmentIds,
    );

    this.socketGateway.emit(
      '*',
      `chat:${targetConversationId}:new_message`,
      message,
    );

    return message;
  }

  async markAsRead(conversationId: string, userId: number) {
    const conversation = await this.getConversation(conversationId, userId);
    const lastMessageId = conversation.lastMessageId;

    if (!lastMessageId) return { success: true };

    await this.conversationRepo.markAsRead(
      conversationId,
      userId,
      lastMessageId,
    );

    conversation.participants
      .filter((p) => p.userId !== userId)
      .forEach((p) => {
        this.socketGateway.emit(`user:${p.userId}`, 'messages_read', {
          conversationId,
          userId,
          lastSeenMessageId: lastMessageId,
        });
      });

    return { success: true };
  }

  private mapConversation(conversation: any, currentUserId: number) {
    if (conversation.isGroup) {
      return conversation;
    }

    const opponent = conversation.participants.find((p: any) => {
      const pUserId = p.userId ?? p.id;
      return pUserId !== currentUserId;
    });
    const opponentName = opponent?.user?.name ?? opponent?.name;
    const opponentImage =
      opponent?.user?.profilePicture ?? opponent?.profilePicture;

    const self = conversation.participants.find((p: any) => {
      const pUserId = p.userId ?? p.id;
      return pUserId === currentUserId;
    });
    const selfImage = self?.user?.profilePicture ?? self?.profilePicture;

    const name =
      conversation.name ?? opponentName ?? (self ? 'You' : 'Unknown');

    const image = conversation.image ?? opponentImage ?? selfImage ?? null;

    return {
      ...conversation,
      name,
      image,
    };
  }
}
