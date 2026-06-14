import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DeleteQueryNotificationDto,
  QueryNotificationsDto,
} from '../dto/query-notifications.dto';
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
    const { app, page, limit, search } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      app,
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
  async deleteAllByUserId(userId: number, query: DeleteQueryNotificationDto) {
    return await this.prisma.notification.deleteMany({
      where: { userId, app: query.app },
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
    return await this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.notification.count({ where: { id } });
    return count > 0;
  }
}
