import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Env } from '@/common/config/app.config';
import { PrismaService } from '@/infra/prisma/prisma.service';
import {
  INotificationService,
  NotificationSendData,
} from './interfaces/notification.service.interface';

@Injectable()
export class OneSignalService implements INotificationService {
  private readonly client: AxiosInstance;
  private readonly appId: string;
  private readonly logger = new Logger(OneSignalService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    this.appId = this.config.get('ONESIGNAL_APP_ID', { infer: true });
    this.client = axios.create({
      baseURL: 'https://onesignal.com/api/v1',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Basic ${this.config.get('ONESIGNAL_API_KEY', { infer: true })}`,
      },
      timeout: 5000,
    });
    this.logger.debug('🔌 OneSignal client initialized');
  }

  async sendNotification(data: NotificationSendData): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(
      `📨 Fetching devices for ${data.userIds.length} user(s): [${data.userIds.join(', ')}]`,
    );

    try {
      const devices = await this.prisma.userDevice.findMany({
        where: { userId: { in: data.userIds } },
        select: { oneSignalPlayerId: true },
      });

      this.logger.debug(`📱 Found ${devices.length} device(s) in database`);

      const player_ids = devices
        .map((d) => d.oneSignalPlayerId)
        .filter(Boolean) as string[];

      this.logger.debug(
        `✅ Filtered to ${player_ids.length} valid player ID(s)`,
      );

      if (!player_ids.length) {
        this.logger.warn(
          `⚠️  No valid OneSignal player IDs found for users: [${data.userIds.join(', ')}]`,
        );
        return;
      }

      this.logger.debug(
        `📤 Sending notification to ${player_ids.length} player(s): "${data.message}"`,
      );

      const response = await this.client.post('/notifications', {
        app_id: this.appId,
        include_player_ids: player_ids,
        headings: { en: data.title },
        contents: { en: data.message },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `✨ Notification sent successfully to ${player_ids.length} player(s) - Response ID: ${response.data?.body?.id || 'N/A'} (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const axiosError = error as AxiosError;

      this.logger.error(
        `❌ Failed to send notification to ${data.userIds.length} user(s) (${duration}ms) - ${axiosError?.message || 'Unknown error'}`,
        {
          status: axiosError?.response?.status,
          data: axiosError?.response?.data,
          userIds: data.userIds,
          message: data.message,
        },
      );

      throw error;
    }
  }
}
