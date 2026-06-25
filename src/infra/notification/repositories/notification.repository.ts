import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { NotificationSearchableFields } from '../notification.constants';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated notifications for a user
   */
  async findPaginatedByUserId(
    userId: number,
    query: QueryNotificationsDto,
  ): Promise<[notifications: any[], total: number]> {
    const { page, limit, search } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (search) {
      where.OR = NotificationSearchableFields.map((field) => ({
        [field]: {
          contains: search,
          mode: 'insensitive',
        },
      }));
    }

    return this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string) {
    return await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Delete a single notification
   */
  async deleteOne(notificationId: string) {
    return await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllByUserId(userId: number) {
    return await this.prisma.notification.deleteMany({
      where: { userId },
    });
  }

  /**
   * Find notification by ID and user ID (for verification)
   */
  async findByIdAndUserId(notificationId: string, userId: number) {
    return await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  async createMany(notifications: Prisma.NotificationCreateManyInput[]) {
    const userIds = notifications.map((n) => n.userId);

    const existingUsers = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    const validUserIds = new Set(existingUsers.map((u) => u.id));
    const validNotifications = notifications.filter((n) =>
      validUserIds.has(n.userId),
    );

    if (validNotifications.length === 0) {
      return { count: 0 };
    }

    return await this.prisma.notification.createMany({
      data: validNotifications,
    });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.notification.count({ where: { id } });
    return count > 0;
  }

  // ─── UserDevice ───────────────────────────────────────────────────────────

  /**
   * Upsert a push token for a user.
   * If the (userId, token) pair already exists, mark it active and update lastSeenAt.
   * Otherwise create a new record.
   */
  async upsertDevice(userId: number, token: string, platform?: string) {
    return await this.prisma.userDevice.upsert({
      where: { userId_token: { userId, token } },
      create: {
        userId,
        token,
        platform,
        isActive: true,
      },
      update: {
        isActive: true,
        lastSeenAt: new Date(),
        ...(platform ? { platform } : {}),
      },
    });
  }

  /**
   * Deactivate all push tokens for a user (called on logout).
   */
  async deactivateDevicesByUserId(userId: number) {
    return await this.prisma.userDevice.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }
}
