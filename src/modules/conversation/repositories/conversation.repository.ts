import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ConversationInclude,
  ConversationMessageType,
  MessageInclude,
} from '../conversation.constant';

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countUsersByIds(ids: number[]): Promise<number> {
    return await this.prisma.user.count({
      where: { id: { in: ids } },
    });
  }

  async findDirectConversation(user1Id: number, user2Id: number) {
    if (user1Id === user2Id) {
      return await this.prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          participants: {
            every: { userId: user1Id },
          },
        },
        include: ConversationInclude,
      });
    }

    return await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: user1Id } } },
          { participants: { some: { userId: user2Id } } },
        ],
      },
      include: ConversationInclude,
    });
  }

  async createConversation(data: {
    name?: string;
    type: 'DIRECT' | 'GROUP' | 'SUPPORT';
    participants: { userId: number; role: 'OWNER' | 'ADMIN' | 'MEMBER' }[];
  }) {
    return await this.prisma.conversation.create({
      data: {
        name: data.name,
        type: data.type,
        participants: {
          create: data.participants.map((p) => ({
            userId: p.userId,
            role: p.role,
          })),
        },
      },
      include: ConversationInclude,
    });
  }

  async findUserConversations(userId: number, limit: number, page: number) {
    const where: Prisma.ConversationWhereInput = {
      participants: {
        some: { userId },
      },
    };

    const conversations = await this.prisma.conversation.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: {
        updatedAt: 'desc',
      },
      include: ConversationInclude,
    });

    const count = await this.prisma.conversation.count({ where });
    return [
      conversations.map(({ participants, ...chat }) => ({
        ...chat,
        participants: participants.map(({ user, role, unreadCount }: any) => ({
          ...user,
          role,
          unreadCount,
        })),
      })),
      count,
    ] as const;
  }

  async findById(id: string, userId: number) {
    return await this.prisma.conversation.findFirst({
      where: {
        id,
        participants: {
          some: { userId },
        },
      },
      include: ConversationInclude,
    });
  }

  async findMessages(conversationId: string, limit: number, cursor?: string) {
    const where: Prisma.ConversationMessageWhereInput = { conversationId };
    const messages = await this.prisma.conversationMessage.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: {
        createdAt: 'desc',
      },
      include: MessageInclude,
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const nextMessage = messages.pop();
      nextCursor = nextMessage ? nextMessage.id : null;
    }

    return [messages, nextCursor] as const;
  }

  async createMessage(
    conversationId: string,
    senderId: number,
    content?: string,
    attachmentIds?: string[],
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create message
      const message = await tx.conversationMessage.create({
        data: {
          conversationId,
          senderId,
          content,
          type: ConversationMessageType.TEXT,
          attachments:
            attachmentIds && attachmentIds.length > 0
              ? {
                  connect: attachmentIds.map((id) => ({ id })),
                }
              : undefined,
        },
        include: MessageInclude,
      });

      // 2. Update conversation's lastMessageId and updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: message.id,
          updatedAt: new Date(),
        },
      });

      // 3. Increment unread count for other participants
      await tx.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: { not: senderId },
        },
        data: {
          unreadCount: {
            increment: 1,
          },
        },
      });

      return message;
    });
  }

  async createSystemMessage(
    conversationId: string,
    senderId: number,
    content: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const message = await tx.conversationMessage.create({
        data: {
          conversationId,
          senderId,
          type: ConversationMessageType.SYSTEM,
          content,
        },
        include: MessageInclude,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: message.id,
          updatedAt: new Date(),
        },
      });

      // Increment unread count for other participants
      await tx.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: { not: senderId },
        },
        data: {
          unreadCount: {
            increment: 1,
          },
        },
      });

      return message;
    });
  }

  async markAsRead(
    conversationId: string,
    userId: number,
    lastMessageId: string,
  ): Promise<{ senderIds: number[] }> {
    // Collect messages to mark seen (sent by others, status != SEEN)
    const unread = await this.prisma.conversationMessage.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'SEEN' },
      },
      select: { id: true, senderId: true },
    });

    if (unread.length > 0) {
      await this.prisma.conversationMessage.updateMany({
        where: { id: { in: unread.map((m) => m.id) } },
        data: { status: 'SEEN', seenAt: new Date() },
      });
    }

    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { unreadCount: 0, lastSeenMessageId: lastMessageId },
    });

    const senderIds = [...new Set(unread.map((m) => m.senderId))];
    return { senderIds };
  }

  async markDelivered(conversationId: string, userId: number): Promise<void> {
    // Find messages in this conversation NOT sent by this user that are still SENT
    const undelivered = await this.prisma.conversationMessage.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: 'SENT',
      },
      select: { id: true, senderId: true },
    });

    if (undelivered.length === 0) return;

    await this.prisma.conversationMessage.updateMany({
      where: {
        id: { in: undelivered.map((m) => m.id) },
      },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    // Return unique senderIds so service can notify them via socket
    // We expose this via return value
    return; // see service for notification logic
  }

  async findUndeliveredMessages(conversationId: string, userId: number) {
    return this.prisma.conversationMessage.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: 'SENT',
      },
      select: { id: true, senderId: true },
    });
  }

  async findSupportConversation(userId: number) {
    return await this.prisma.conversation.findFirst({
      where: {
        type: 'SUPPORT',
        participants: {
          some: { userId },
        },
      },
      include: ConversationInclude,
    });
  }

  async findByIdWithoutUserRestriction(id: string) {
    return await this.prisma.conversation.findUnique({
      where: { id },
      include: ConversationInclude,
    });
  }

  async addParticipant(
    conversationId: string,
    userId: number,
    role: 'ADMIN' | 'MEMBER' = 'MEMBER',
  ) {
    return await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      create: {
        conversationId,
        userId,
        role,
      },
      update: {
        leftAt: null,
      },
    });
  }
}
