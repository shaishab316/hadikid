import {
  BadRequestException,
  ForbiddenException,
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
import { UserRepository } from '../user/repositories/user.repository';
import { ContactRepository } from '../contact/repositories/contact.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationEvent } from './conversation.constant';

@Injectable()
export class ConversationService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly userRepo: UserRepository,
    private readonly contactRepo: ContactRepository,
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
      if (existing) return await this.mapConversation(existing, userId);

      conversation = await this.conversationRepo.createConversation({
        type: 'DIRECT',
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
        type: 'GROUP',
        participants: [
          { userId, role: 'OWNER' as const },
          ...uniqueParticipantIds.map((id) => ({
            userId: id,
            role: 'MEMBER' as const,
          })),
        ],
      });
    }

    const mappedParticipantConversations = await Promise.all(
      uniqueParticipantIds.map(async (pId) => ({
        pId,
        mapped: await this.mapConversation(conversation, pId),
      })),
    );

    this.eventEmitter.emit(ConversationEvent.CREATED, {
      mappedConversations: mappedParticipantConversations,
    });

    return await this.mapConversation(conversation, userId);
  }

  async getConversations(userId: number, query: QueryConversationDto) {
    const { limit, page } = query;
    const [conversations, total] =
      await this.conversationRepo.findUserConversations(userId, limit, page);

    const contacts = await this.contactRepo.findUserContacts(userId);
    const aliasMap = new Map<number, string>();
    contacts.forEach((c) => {
      const isUser1 = c.userId1 === userId;
      const opponentId = isUser1 ? c.userId2 : c.userId1;
      const alias = isUser1 ? c.alias1 : c.alias2;
      if (alias) {
        aliasMap.set(opponentId, alias);
      }
    });

    const mapped = await Promise.all(
      conversations.map((c) => this.mapConversation(c, userId, aliasMap)),
    );
    return { conversations: mapped, total };
  }

  async getConversation(id: string, userId: number) {
    const conversation = await this.conversationRepo.findById(id, userId);
    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you are not a participant',
      );
    }
    return await this.mapConversation(
      {
        ...conversation,
        participants: conversation.participants.map(
          ({ user, role, unreadCount }: any) => ({
            ...user,
            role,
            unreadCount,
          }),
        ),
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
          type: 'DIRECT',
          participants: [
            { userId, role: 'OWNER' as const },
            ...(userId !== recipientId
              ? [{ userId: recipientId, role: 'MEMBER' as const }]
              : []),
          ],
        });

        // Notify recipient of new conversation creation
        if (userId !== recipientId) {
          const mapped = await this.mapConversation(conversation, recipientId);
          this.eventEmitter.emit(ConversationEvent.CREATED, {
            mappedConversations: [{ pId: recipientId, mapped }],
          });
        }
      }

      targetConversationId = conversation.id;
    }

    const conversation = await this.getConversation(
      targetConversationId,
      userId,
    );

    if (conversation.type === 'DIRECT') {
      const opponent = conversation.participants.find(
        (p: any) => p.id !== userId,
      );
      if (opponent) {
        const isBlocked = await this.contactRepo.isBlocked(userId, opponent.id);

        if (isBlocked) {
          throw new ForbiddenException(
            'Cannot send message. This contact is blocked.',
          );
        }
      }
    }

    const message = await this.conversationRepo.createMessage(
      targetConversationId,
      userId,
      content,
      attachmentIds,
    );

    this.eventEmitter.emit(ConversationEvent.MESSAGE_SENT, {
      targetConversationId,
      message,
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: number) {
    const conversation = await this.getConversation(conversationId, userId);
    const lastMessageId = conversation.lastMessageId;

    if (!lastMessageId) return { success: true };

    const { senderIds } = await this.conversationRepo.markAsRead(
      conversationId,
      userId,
      lastMessageId,
    );

    this.eventEmitter.emit(ConversationEvent.MESSAGES_SEEN, {
      senderIds,
      conversationId,
      userId,
      lastMessageId,
    });

    return { success: true };
  }

  private async mapConversation(
    conversation: any,
    currentUserId: number,
    aliasMap?: Map<number, string>,
  ) {
    const participants = conversation.participants.map((p: any) => {
      if (p.slug !== undefined || p.user === undefined) {
        return p;
      }
      const { user, role, unreadCount } = p;
      return {
        ...user,
        role,
        unreadCount,
      };
    });

    const opponent = participants.find((p: any) => p.id !== currentUserId);

    let opponentName = opponent?.name;
    if (conversation.type === 'DIRECT' && opponent) {
      let alias: string | undefined | null = aliasMap?.get(opponent.id);
      if (alias === undefined) {
        const contact = await this.contactRepo.findContactBetweenUsers(
          currentUserId,
          opponent.id,
        );
        if (contact) {
          alias =
            contact.userId1 === currentUserId ? contact.alias1 : contact.alias2;
        }
      }
      if (alias) {
        opponentName = alias;
      }
    }

    const opponentImage = opponent?.profilePicture;

    const self = participants.find((p: any) => p.id === currentUserId);
    const selfImage = self?.profilePicture;

    const name =
      conversation.name ?? opponentName ?? (self ? 'You' : 'Unknown');

    const image = conversation.image ?? opponentImage ?? selfImage ?? null;
    const unreadCount = self?.unreadCount ?? 0;

    return {
      ...conversation,
      participants,
      name,
      image,
      unreadCount,
    };
  }

  async markDelivered(conversationId: string, userId: number) {
    await this.getConversation(conversationId, userId);

    // Get undelivered messages in this convo not sent by current user
    const messages = await this.conversationRepo.findUndeliveredMessages(
      conversationId,
      userId,
    );

    if (messages.length === 0) return { success: true };

    await this.conversationRepo.markDelivered(conversationId, userId);

    // Notify each sender their messages were delivered
    const senderIds = [...new Set(messages.map((m: any) => m.senderId))];
    this.eventEmitter.emit(ConversationEvent.MESSAGES_DELIVERED, {
      senderIds,
      conversationId,
      userId,
    });

    return { success: true };
  }
}
