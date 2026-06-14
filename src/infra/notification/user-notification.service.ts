import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { Pagination } from '@/common/types/pagination';
import {
  DeleteQueryNotificationDto,
  QueryNotificationsDto,
} from './dto/query-notifications.dto';

@Injectable()
export class UserNotificationService {
  private readonly logger = new Logger(UserNotificationService.name);

  constructor(private readonly notificationRepo: NotificationRepository) {}

  /**
   * Get paginated notifications for a user
   */
  async getNotifications(userId: number, query: QueryNotificationsDto) {
    return await this.notificationRepo.findPaginatedByUserId(userId, query);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: number) {
    this.logger.debug(
      `✅ Marking notification ${notificationId} as read for user ${userId}`,
    );

    const notification = await this.notificationRepo.findByIdAndUserId(
      notificationId,
      userId,
    );

    if (!notification) {
      this.logger.warn(
        `⚠️ Notification not found: ${notificationId} for user ${userId}`,
      );
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.notificationRepo.markAsRead(notificationId);

    this.logger.debug(
      `✅ Notification ${notificationId} marked as read for user ${userId}`,
    );

    return updated;
  }

  /**
   * Delete a single notification
   */
  async deleteNotification(notificationId: string, userId: number) {
    this.logger.debug(
      `🗑️ Deleting notification ${notificationId} for user ${userId}`,
    );

    const notification = await this.notificationRepo.findByIdAndUserId(
      notificationId,
      userId,
    );

    if (!notification) {
      this.logger.warn(
        `⚠️ Notification not found: ${notificationId} for user ${userId}`,
      );
      throw new NotFoundException('Notification not found');
    }

    const deleted = await this.notificationRepo.deleteOne(notificationId);

    this.logger.debug(
      `🗑️ Notification ${notificationId} deleted for user ${userId}`,
    );

    return deleted;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(
    userId: number,
    query: DeleteQueryNotificationDto,
  ) {
    this.logger.debug(`🗑️ Deleting all notifications for user ${userId}`);

    const result = await this.notificationRepo.deleteAllByUserId(userId, query);

    this.logger.debug(
      `🗑️ Deleted ${result.count} notifications for user ${userId}`,
    );

    return result;
  }
}
