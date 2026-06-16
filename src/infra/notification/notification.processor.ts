import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATION_QUEUE,
  NOTIFICATION_SERVICE,
} from './notification.constants';
import type {
  INotificationService,
  NotificationSendData,
} from './interfaces/notification.service.interface';
import { NotificationRepository } from './repositories/notification.repository';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: INotificationService,
    private readonly notificationRepo: NotificationRepository,
  ) {
    super();
  }

  async process(job: Job<NotificationSendData>) {
    const startTime = Date.now();
    this.logger.debug(
      `📨 [Job: ${job.id}] Processing notification job: ${job.name}`,
    );

    try {
      this.logger.debug(
        `📨 [Job: ${job.id}] Sending notification to ${job.data.userIds.length} user(s)`,
      );

      const alreadyProcessed = await this.notificationRepo.existsById(
        job.data.id,
      );

      if (!alreadyProcessed) {
        await this.notificationRepo.createMany(
          job.data.userIds.map((userId) => ({
            userId,
            title: job.data.title,
            message: job.data.message,
            type: job.data.type,
            id: job.data.id,
          })),
        );
      }

      await this.notificationService.sendNotification(job.data);

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ [Job: ${job.id}] Notification job completed successfully (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ [Job: ${job.id}] Notification job failed after ${duration}ms - ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          jobName: job.name,
          userIds: job.data.userIds,
          attempts: job.attemptsMade,
          maxAttempts: job.opts.attempts,
        },
      );

      throw error;
    }
  }
}
