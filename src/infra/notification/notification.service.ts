import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  NOTIFICATION_JOBS,
  NOTIFICATION_QUEUE,
} from './notification.constants';
import { JobsOptions, Queue } from 'bullmq';
import {
  NotificationData,
  NotificationSendData,
} from './interfaces/notification.service.interface';
import { ulid } from 'ulid';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue<NotificationSendData>,
  ) {}

  async sendNotification(
    { message, title, type, app, userIds }: NotificationData,
    options: JobsOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50, age: 24 * 60 * 60 },
    },
  ) {
    await this.notificationQueue.add(
      NOTIFICATION_JOBS.SEND,
      {
        userIds,
        title,
        message,
        type,
        id: ulid(),
        app,
      },
      options,
    );
  }
}
