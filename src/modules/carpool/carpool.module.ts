import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CarpoolController } from './carpool.controller';
import { CarpoolService } from './carpool.service';
import { CarpoolRepository } from './repositories/carpool.repository';
import { CARPOOL_QUEUE } from './carpool.constant';
import { CarpoolChatListener } from './carpool-chat.listener';
import { CarpoolNotificationListener } from './carpool-notification.listener';

@Module({
  imports: [BullModule.registerQueue({ name: CARPOOL_QUEUE })],
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
