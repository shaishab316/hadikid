import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type {
  CarpoolCreatedEvent,
  CarpoolDeletedEvent,
  CarpoolDriverAssignedEvent,
  CarpoolDriverResignedEvent,
  CarpoolInviteAcceptedEvent,
  CarpoolInviteDeclinedEvent,
  CarpoolInviteWithdrawnEvent,
  CarpoolMemberInvitedEvent,
  CarpoolMemberLeftEvent,
  CarpoolRoundCreatedEvent,
  CarpoolRoundCompletedEvent,
  CarpoolRoundReminderEvent,
  CarpoolRoundStartedEvent,
  CarpoolUpdatedEvent,
} from './carpool.interface';
import { CarpoolEvent } from './carpool.constant';
import { NotificationType } from '@/infra/notification/notification.constants';
import { NotificationService } from '@/infra/notification/notification.service';

@Injectable()
export class CarpoolNotificationListener {
  private readonly logger = new Logger(CarpoolNotificationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private async notify(
    userIds: number[],
    type: NotificationType,
    title: string,
    message: string,
    actionUrl: string,
    metadata: Record<string, unknown> = {},
  ) {
    if (!userIds.length) return;

    const unique = [...new Set(userIds)];

    try {
      await this.notificationService.sendNotification({
        userIds: unique,
        type,
        title,
        message,
        actionUrl,
        metadata,
      });
      this.logger.log(
        `[${type}] Notification queued for ${unique.length} users`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private carpoolUrl = (id: string) => `/carpools/${id}`;

  @OnEvent(CarpoolEvent.CREATED)
  async onCreated({ carpoolId, title, ownerId }: CarpoolCreatedEvent) {
    await this.notify(
      [ownerId],
      NotificationType.CARPOOL_UPDATED,
      'Carpool Created',
      `Your carpool "${title}" is ready. Invite members to get started!`,
      this.carpoolUrl(carpoolId),
      { carpoolId },
    );
  }

  @OnEvent(CarpoolEvent.UPDATED)
  async onUpdated({
    carpoolId,
    title,
    updatedById,
    memberIds,
    changedFields,
  }: CarpoolUpdatedEvent) {
    const othersToNotify = memberIds.filter((id) => id !== updatedById);
    const fieldsSummary = changedFields.join(', ');

    await this.notify(
      othersToNotify,
      NotificationType.CARPOOL_UPDATED,
      '✏️ Carpool Updated',
      `"${title}" has been updated (${fieldsSummary}). Check the latest details.`,
      this.carpoolUrl(carpoolId),
      { carpoolId, changedFields },
    );
  }

  @OnEvent(CarpoolEvent.DELETED)
  async onDeleted({
    carpoolId,
    title,
    deletedById,
    memberIds,
  }: CarpoolDeletedEvent) {
    const othersToNotify = memberIds.filter((id) => id !== deletedById);

    await this.notify(
      othersToNotify,
      NotificationType.CARPOOL_UPDATED,
      '🚫 Carpool Cancelled',
      `The carpool "${title}" has been cancelled by the owner.`,
      '/carpools',
      { carpoolId },
    );
  }

  @OnEvent(CarpoolEvent.DRIVER_ASSIGNED)
  async onDriverAssigned({
    carpoolId,
    title,
    driverId,
    assignedById,
    memberIds,
  }: CarpoolDriverAssignedEvent) {
    await this.notify(
      [driverId],
      NotificationType.DRIVER_UPDATED,
      'You are now the Driver',
      `You've been assigned as the driver for "${title}". Get ready to roll!`,
      this.carpoolUrl(carpoolId),
      { carpoolId },
    );

    const othersToNotify = memberIds.filter(
      (id) => id !== driverId && id !== assignedById,
    );
    if (othersToNotify.length) {
      await this.notify(
        othersToNotify,
        NotificationType.DRIVER_UPDATED,
        'Driver Assigned',
        `A driver has been assigned for "${title}".`,
        this.carpoolUrl(carpoolId),
        { carpoolId, driverId },
      );
    }
  }

  @OnEvent(CarpoolEvent.DRIVER_RESIGNED)
  async onDriverResigned({
    carpoolId,
    title,
    formerDriverId,
    memberIds,
  }: CarpoolDriverResignedEvent) {
    const othersToNotify = memberIds.filter((id) => id !== formerDriverId);

    await this.notify(
      othersToNotify,
      NotificationType.DRIVER_UPDATED,
      '⚠️ Driver Left',
      `The driver for "${title}" has stepped down. A new driver is needed.`,
      this.carpoolUrl(carpoolId),
      { carpoolId },
    );
  }

  @OnEvent(CarpoolEvent.MEMBER_INVITED)
  async onMemberInvited({
    carpoolId,
    title,
    invitedUserId,
    invitedByUserId,
    message,
  }: CarpoolMemberInvitedEvent) {
    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedByUserId },
      select: { name: true },
    });

    await this.notify(
      [invitedUserId],
      NotificationType.CARPOOL_REQUEST,
      'Carpool Invitation',
      `${inviter?.name ?? 'Someone'} invited you to join "${title}"${message ? `: "${message}"` : '.'}`,
      `/carpools/invites/${carpoolId}`,
      { carpoolId, invitedByUserId, message },
    );
  }

  @OnEvent(CarpoolEvent.INVITE_WITHDRAWN)
  async onInviteWithdrawn({
    carpoolId,
    title,
    invitedUserId,
  }: CarpoolInviteWithdrawnEvent) {
    await this.notify(
      [invitedUserId],
      NotificationType.CARPOOL_REQUEST,
      '↩️ Invitation Cancelled',
      `Your invitation to "${title}" has been withdrawn.`,
      '/carpools',
      { carpoolId },
    );
  }

  @OnEvent(CarpoolEvent.INVITE_ACCEPTED)
  async onInviteAccepted({
    carpoolId,
    title,
    userId,
    memberIds,
  }: CarpoolInviteAcceptedEvent) {
    const newMember = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const othersToNotify = memberIds.filter((id) => id !== userId);

    await this.notify(
      othersToNotify,
      NotificationType.CARPOOL_REQUEST,
      'New Member Joined',
      `${newMember?.name ?? 'Someone'} joined "${title}".`,
      this.carpoolUrl(carpoolId),
      { carpoolId, newMemberId: userId },
    );
  }

  @OnEvent(CarpoolEvent.INVITE_DECLINED)
  async onInviteDeclined({
    carpoolId,
    title,
    userId,
    ownerId,
  }: CarpoolInviteDeclinedEvent) {
    const decliner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.notify(
      [ownerId],
      NotificationType.WARNING,
      '❌ Invitation Declined',
      `${decliner?.name ?? 'Someone'} declined your invitation to "${title}".`,
      this.carpoolUrl(carpoolId),
      { carpoolId, declinedByUserId: userId },
    );
  }

  @OnEvent(CarpoolEvent.MEMBER_LEFT)
  async onMemberLeft({
    carpoolId,
    title,
    userId,
    memberIds,
  }: CarpoolMemberLeftEvent) {
    const leaver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const othersToNotify = memberIds.filter((id) => id !== userId);

    await this.notify(
      othersToNotify,
      NotificationType.CARPOOL_UPDATED,
      'Member Left',
      `${leaver?.name ?? 'A member'} has left "${title}".`,
      this.carpoolUrl(carpoolId),
      { carpoolId, leftUserId: userId },
    );
  }

  @OnEvent(CarpoolEvent.ROUND_STARTED)
  async onRoundStarted({
    carpoolId,
    roundId,
    carpoolTitle,
    type,
    memberIds,
  }: CarpoolRoundStartedEvent) {
    const tripType = type === 'PICKUP' ? 'Pickup' : 'Drop-off';

    await this.notify(
      memberIds,
      NotificationType.CARPOOL_UPDATED,
      `${tripType} Trip Started`,
      `The ${type.toLowerCase()} for "${carpoolTitle}" is now underway!`,
      `/carpools/${carpoolId}/rounds/${roundId}`,
      { carpoolId, roundId, type },
    );
  }

  @OnEvent(CarpoolEvent.ROUND_COMPLETED)
  async onRoundCompleted({
    carpoolId,
    roundId,
    carpoolTitle,
    driverId,
    memberIds,
  }: CarpoolRoundCompletedEvent) {
    const round = await this.prisma.carpoolRound.findUnique({
      where: { id: roundId },
      select: { scheduledAt: true, driverId: true },
    });

    const driverUserId = driverId ?? round?.driverId ?? 0;

    const driver = driverUserId
      ? await this.prisma.user.findUnique({
          where: { id: driverUserId },
          select: {
            name: true,
            profilePicture: {
              select: { url: true },
            },
          },
        })
      : null;

    const dateFormatted = round?.scheduledAt
      ? new Date(round.scheduledAt).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

    const recipients = memberIds.filter((id) => id !== driverUserId);

    await this.notify(
      recipients,
      NotificationType.TRIP_COMPLETED,
      'Trip Completed',
      `Rate your driver for ${carpoolTitle}`,
      `/carpools/${carpoolId}/rounds/${roundId}`,
      {
        carpoolId,
        driverUserId,
        driverName: driver?.name ?? 'Unknown Driver',
        driverAvatar: driver?.profilePicture?.url ?? null,
        carpoolTitle,
        date: dateFormatted,
      },
    );
  }

  @OnEvent(CarpoolEvent.ROUND_CREATED)
  async onRoundCreated({
    carpoolId,
    roundId,
    carpoolTitle,
    type,
    scheduledAt,
    memberIds,
  }: CarpoolRoundCreatedEvent) {
    const tripType = type === 'PICKUP' ? 'Pickup' : 'Drop-off';

    await this.notify(
      memberIds,
      NotificationType.CARPOOL_UPDATED,
      `New ${tripType} Trip Scheduled`,
      `A new ${type.toLowerCase()} trip for "${carpoolTitle}" has been scheduled for ${scheduledAt.toLocaleString()}.`,
      `/carpools/${carpoolId}/rounds/${roundId}`,
      { carpoolId, roundId, type },
    );
  }

  @OnEvent(CarpoolEvent.ROUND_REMINDER)
  async onRoundReminder({
    carpoolId,
    roundId,
    carpoolTitle,
    minutesBefore,
    memberIds,
  }: CarpoolRoundReminderEvent) {
    await this.notify(
      memberIds,
      NotificationType.CARPOOL_UPDATED,
      `⏰ Trip in ${minutesBefore} Minutes`,
      `Your carpool "${carpoolTitle}" starts in ${minutesBefore} minutes. Get ready!`,
      `/carpools/${carpoolId}/rounds/${roundId}`,
      { carpoolId, roundId, minutesBefore },
    );
  }
}
