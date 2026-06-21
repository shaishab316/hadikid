import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { CarpoolController } from './carpool.controller';
import { CarpoolService } from './carpool.service';
import { CarpoolRepository } from './repositories/carpool.repository';
import { CARPOOL_QUEUE } from './carpool.constant';
import { CarpoolChatListener } from './carpool-chat.listener';
import { CarpoolNotificationListener } from './carpool-notification.listener';

@Module({
  imports: [
    BullModule.registerQueue({ name: CARPOOL_QUEUE }),
    BullBoardModule.forFeature({ name: CARPOOL_QUEUE, adapter: BullMQAdapter }),
  ],
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
