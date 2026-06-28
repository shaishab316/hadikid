import { Module } from '@nestjs/common';
import { CarpoolController } from './carpool.controller';
import { CarpoolService } from './carpool.service';
import { CarpoolRepository } from './repositories/carpool.repository';
import { CarpoolChatListener } from './carpool-chat.listener';
import { CarpoolNotificationListener } from './carpool-notification.listener';
import { NotificationModule } from '@/infra/notification/notification.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [NotificationModule, ConversationModule],
  controllers: [CarpoolController],
  providers: [
    CarpoolService,
    CarpoolRepository,
    CarpoolNotificationListener,
    CarpoolChatListener,
  ],
  exports: [
    CarpoolService,
    CarpoolRepository,
    CarpoolNotificationListener,
    CarpoolChatListener,
  ],
})
export class CarpoolModule {}
