import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { CarpoolEvent } from './carpool.constant';
import type {
  CarpoolCreatedEvent,
  CarpoolInviteAcceptedEvent,
  CarpoolMemberLeftEvent,
} from './carpool.interface';

// ─────────────────────────────────────────────────────────────────────────────
// CHAT LISTENER
// Responsibility: keep the carpool group conversation in sync with membership.
// Everything else (messages, read receipts, etc.) is handled by ConversationModule.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CarpoolChatListener {
  private readonly logger = new Logger(CarpoolChatListener.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── On carpool created → create the group chat ───────────────────────────

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

    // Store the conversationId on the carpool for later lookups.
    // If your Carpool model doesn't have a conversationId field yet, add:
    //   conversationId String? @unique
    // to the Prisma schema and run a migration.
    await this.prisma.carpool.update({
      where: { id: carpoolId },
      data: { conversationId: conversation.id } as any,
    });

    this.logger.log(
      `Group chat ${conversation.id} created for carpool ${carpoolId}`,
    );
  }

  // ─── On invite accepted → add new member to group chat ───────────────────

  @OnEvent(CarpoolEvent.INVITE_ACCEPTED)
  async onMemberJoined({
    carpoolId,
    userId,
    conversationId,
  }: CarpoolInviteAcceptedEvent) {
    if (!conversationId) return;

    // Add participant (ignore if already exists)
    await this.prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, role: 'MEMBER' },
      update: { leftAt: null }, // re-join if they previously left
    });

    // Post system message
    await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'SYSTEM',
        content: 'joined the group.',
      },
    });

    this.logger.log(`User ${userId} added to chat ${conversationId}`);
  }

  // ─── On member left → remove from group chat ─────────────────────────────

  @OnEvent(CarpoolEvent.MEMBER_LEFT)
  async onMemberLeft({ userId, conversationId }: CarpoolMemberLeftEvent) {
    if (!conversationId) return;

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { leftAt: new Date() },
    });

    await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'SYSTEM',
        content: 'left the group.',
      },
    });

    this.logger.log(`User ${userId} removed from chat ${conversationId}`);
  }
}
