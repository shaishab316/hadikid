import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserNotificationService } from './user-notification.service';
import {
  DeleteQueryNotificationDto,
  QueryNotificationsDto,
} from './dto/query-notifications.dto';
import { MediumThrottle } from '@/common/decorators/throttle.decorator';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResponse } from '@/common/types/api-response';

@ApiTags('Notifications')
@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: UserNotificationService) {}

  /**
   * GET /notifications
   * Get user's notifications with pagination
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getNotifications(
    @CurrentUser('id') userId: number,
    @Query() query: QueryNotificationsDto,
  ): Promise<ApiResponse> {
    const [data, total] = await this.notificationService.getNotifications(
      userId,
      query,
    );

    return {
      message: 'Notifications retrieved successfully',
      data,
      pagination: {
        limit: query.limit,
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * POST /notifications/:notificationId/read
   * Mark a notification as read
   */
  @Post(':notificationId/read')
  @MediumThrottle()
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser('id') userId: number,
    @Param('notificationId') notificationId: string,
  ) {
    const notification = await this.notificationService.markAsRead(
      notificationId,
      userId,
    );

    return {
      message: 'Notification marked as read',
      data: notification,
    };
  }

  /**
   * DELETE /notifications/:notificationId
   * Delete a single notification
   */
  @Delete(':notificationId')
  @MediumThrottle()
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @CurrentUser('id') userId: number,
    @Param('notificationId') notificationId: string,
  ) {
    const notification = await this.notificationService.deleteNotification(
      notificationId,
      userId,
    );

    return {
      message: 'Notification deleted successfully',
      data: notification,
    };
  }

  /**
   * DELETE /notifications
   * Delete all notifications for the user
   */
  @Delete()
  @MediumThrottle()
  @HttpCode(HttpStatus.OK)
  async deleteAllNotifications(
    @CurrentUser('id') userId: number,
    @Query() query: DeleteQueryNotificationDto,
  ) {
    const result = await this.notificationService.deleteAllNotifications(
      userId,
      query,
    );

    return {
      message: 'All notifications deleted successfully',
      data: result,
    };
  }
}
