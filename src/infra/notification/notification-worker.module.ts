import { Module } from '@nestjs/common';
import { NotificationModule } from './notification.module';
import { NotificationProcessor } from './notification.processor';

@Module({
  imports: [NotificationModule],
  providers: [NotificationProcessor],
})
export class NotificationWorkerModule {}
