import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConversationInclude, MessageInclude } from '../conversation.constant';

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

  async markAsRead(
    conversationId: string,
    userId: number,
    lastMessageId: string,
  ) {
    return await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        unreadCount: 0,
        lastSeenMessageId: lastMessageId,
      },
    });
  }

  async findContactBetweenUsers(userId1: number, userId2: number) {
    const minId = Math.min(userId1, userId2);
    const maxId = Math.max(userId1, userId2);
    return await this.prisma.contact.findUnique({
      where: {
        userId1_userId2: {
          userId1: minId,
          userId2: maxId,
        },
      },
    });
  }

  async isBlocked(userId1: number, userId2: number): Promise<boolean> {
    const contact = await this.findContactBetweenUsers(userId1, userId2);
    return contact?.isBlocked ?? false;
  }

  async findUserContacts(userId: number) {
    return await this.prisma.contact.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      select: {
        userId1: true,
        userId2: true,
        alias1: true,
        alias2: true,
      },
    });
  }
}
