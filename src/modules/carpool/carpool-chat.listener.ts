import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { CarpoolEvent } from './carpool.constant';
import type {
  CarpoolCreatedEvent,
  CarpoolUpdatedEvent,
  CarpoolDeletedEvent,
  CarpoolDriverAssignedEvent,
  CarpoolDriverResignedEvent,
  CarpoolInviteAcceptedEvent,
  CarpoolMemberLeftEvent,
  CarpoolRoundCreatedEvent,
  CarpoolRoundStartedEvent,
  CarpoolRoundCompletedEvent,
  CarpoolVehicleLocationUpdatedEvent,
} from './carpool.interface';
import {
  ConversationMessageType,
  MessageInclude,
} from '../conversation/conversation.constant';
import { SocketGateway } from '@/infra/socket/socket.gateway';

@Injectable()
export class CarpoolChatListener {
  private readonly logger = new Logger(CarpoolChatListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: SocketGateway,
  ) {}

  private async createSystemMessage(
    conversationId: string,
    senderId: number,
    content: string,
  ) {
    try {
      const message = await this.prisma.$transaction(async (tx) => {
        const msg = await tx.conversationMessage.create({
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
            lastMessageId: msg.id,
            updatedAt: new Date(),
          },
        });

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

        return msg;
      });

      this.socketGateway.emit(
        '*',
        `chat:${conversationId}:new_message`,
        message,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create system message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

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

    await this.createSystemMessage(
      conversation.id,
      ownerId,
      `Carpool "${title}" was created.`,
    );

    this.logger.log(
      `Group chat ${conversation.id} created for carpool ${carpoolId}`,
    );
  }

  @OnEvent(CarpoolEvent.UPDATED)
  async onUpdated({
    carpoolId,
    updatedById,
    changedFields,
  }: CarpoolUpdatedEvent) {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
      select: { conversationId: true },
    });

    if (carpool?.conversationId) {
      const fieldsSummary = changedFields.join(', ');
      await this.createSystemMessage(
        carpool.conversationId,
        updatedById,
        `Carpool details were updated (${fieldsSummary}).`,
      );
    }
  }

  @OnEvent(CarpoolEvent.DELETED)
  async onDeleted({ carpoolId, title, deletedById }: CarpoolDeletedEvent) {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
      select: { conversationId: true },
    });

    if (carpool?.conversationId) {
      await this.createSystemMessage(
        carpool.conversationId,
        deletedById,
        `Carpool "${title}" was cancelled.`,
      );
    }
  }

  @OnEvent(CarpoolEvent.DRIVER_ASSIGNED)
  async onDriverAssigned({
    carpoolId,
    driverId,
    assignedById,
  }: CarpoolDriverAssignedEvent) {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
      select: { conversationId: true },
    });

    if (carpool?.conversationId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: driverId },
        select: { name: true },
      });
      await this.createSystemMessage(
        carpool.conversationId,
        assignedById,
        `"${driver?.name}" has been assigned as the driver.`,
      );
    }
  }

  @OnEvent(CarpoolEvent.DRIVER_RESIGNED)
  async onDriverResigned({
    carpoolId,
    formerDriverId,
  }: CarpoolDriverResignedEvent) {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
      select: { conversationId: true },
    });

    if (carpool?.conversationId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: formerDriverId },
        select: { name: true },
      });
      await this.createSystemMessage(
        carpool.conversationId,
        formerDriverId,
        `"${driver?.name}" stepped down as the driver. A new driver is needed.`,
      );
    }
  }

  @OnEvent(CarpoolEvent.INVITE_ACCEPTED)
  async onMemberJoined({ userId, conversationId }: CarpoolInviteAcceptedEvent) {
    if (!conversationId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.createSystemMessage(
      conversationId,
      userId,
      `'${user?.name}' joined this conversation.`,
    );

    this.logger.log(`User ${userId} added to chat ${conversationId}`);
  }

  @OnEvent(CarpoolEvent.MEMBER_LEFT)
  async onMemberLeft({ userId, conversationId }: CarpoolMemberLeftEvent) {
    if (!conversationId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { leftAt: new Date() },
    });

    await this.createSystemMessage(
      conversationId,
      userId,
      `'${user?.name}' left from this conversation.`,
    );

    this.logger.log(`User ${userId} removed from chat ${conversationId}`);
  }

  @OnEvent(CarpoolEvent.ROUND_CREATED)
  async onRoundCreated({
    carpoolId,
    type,
    scheduledAt,
    driverId,
    ownerId,
  }: CarpoolRoundCreatedEvent) {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
      select: { conversationId: true },
    });

    if (carpool?.conversationId) {
      const senderId = driverId ?? ownerId;
      const tripType = type === 'PICKUP' ? 'pickup' : 'drop-off';
      await this.createSystemMessage(
        carpool.conversationId,
        senderId,
        `New ${tripType} trip scheduled for ${scheduledAt.toLocaleString()}.`,
      );
    }
  }

  @OnEvent(CarpoolEvent.ROUND_STARTED)
  async onRoundStarted({
    carpoolId,
    type,
    driverId,
  }: CarpoolRoundStartedEvent) {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
      select: { conversationId: true },
    });

    if (carpool?.conversationId) {
      const tripType = type === 'PICKUP' ? 'pickup' : 'drop-off';
      await this.createSystemMessage(
        carpool.conversationId,
        driverId,
        `The ${tripType} trip has started.`,
      );
    }
  }

  @OnEvent(CarpoolEvent.ROUND_COMPLETED)
  async onRoundCompleted({
    carpoolId,
    type,
    driverId,
    memberIds,
  }: CarpoolRoundCompletedEvent) {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
      select: { conversationId: true, driverId: true },
    });

    if (carpool?.conversationId) {
      const senderId = driverId ?? carpool.driverId ?? memberIds[0] ?? 0;
      const tripType = type === 'PICKUP' ? 'pickup' : 'drop-off';
      await this.createSystemMessage(
        carpool.conversationId,
        senderId,
        `The ${tripType} trip has been completed successfully.`,
      );
    }
  }

  @OnEvent(CarpoolEvent.VEHICLE_LOCATION_UPDATED)
  onVehicleLocationUpdated(payload: CarpoolVehicleLocationUpdatedEvent) {
    const { carpoolId, latitude, longitude } = payload;

    this.socketGateway.emit('*', `carpool:${carpoolId}:vehicle-location`, {
      carpoolId,
      latitude,
      longitude,
      updatedAt: new Date(),
    });
  }
}
