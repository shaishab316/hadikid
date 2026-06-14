import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { OneSignalService } from './onesignal.service';
import {
  NOTIFICATION_QUEUE,
  NOTIFICATION_SERVICE,
} from './notification.constants';
import { NotificationController } from './notification.controller';
import { UserNotificationService } from './user-notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationService } from './notification.service';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATION_QUEUE })],
  controllers: [NotificationController],
  providers: [
    UserNotificationService,
    NotificationService,
    NotificationRepository,
    { provide: NOTIFICATION_SERVICE, useClass: OneSignalService },
  ],
  exports: [
    UserNotificationService,
    NotificationRepository,
    NotificationService,
    { provide: NOTIFICATION_SERVICE, useClass: OneSignalService },
  ],
})
export class NotificationModule {}
