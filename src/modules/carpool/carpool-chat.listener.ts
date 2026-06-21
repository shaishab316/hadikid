import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { CarpoolEvent } from './carpool.constant';
import type {
  CarpoolCreatedEvent,
  CarpoolInviteAcceptedEvent,
  CarpoolMemberLeftEvent,
} from './carpool.interface';
import { ConversationMessageType } from '../conversation/conversation.constant';

@Injectable()
export class CarpoolChatListener {
  private readonly logger = new Logger(CarpoolChatListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(CarpoolEvent.CREATED)
  async onCarpoolCreated({ carpoolId, title, ownerId }: CarpoolCreatedEvent) {
    const conversation = await this.prisma.conversation.create({
      data: {
        name: title,
        type: 'GROUP',
        participants: {
          create: { userId: ownerId, role: 'ADMIN' },
        },
      },
    });

    await this.prisma.carpool.update({
      where: { id: carpoolId },
      data: { conversationId: conversation.id } as any,
    });

    this.logger.log(
      `Group chat ${conversation.id} created for carpool ${carpoolId}`,
    );
  }

  @OnEvent(CarpoolEvent.INVITE_ACCEPTED)
  async onMemberJoined({ userId, conversationId }: CarpoolInviteAcceptedEvent) {
    if (!conversationId) return;

    this.logger.log(`User ${userId} added to chat ${conversationId}`);
  }

  @OnEvent(CarpoolEvent.MEMBER_LEFT)
  async onMemberLeft({ userId, conversationId }: CarpoolMemberLeftEvent) {
    if (!conversationId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { leftAt: new Date() },
    });

    await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        senderId: userId,
        type: ConversationMessageType.SYSTEM,
        content: `'${user?.name}' left from this conversation.`,
      },
    });

    this.logger.log(`User ${userId} removed from chat ${conversationId}`);
  }
}
