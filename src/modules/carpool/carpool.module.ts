import { Module } from '@nestjs/common';
import { CarpoolService } from './carpool.service';
import { CarpoolController } from './carpool.controller';
import { CarpoolRepository } from './repositories/carpool.repository';

@Module({
  controllers: [CarpoolController],
  providers: [CarpoolService, CarpoolRepository],
  exports: [CarpoolService, CarpoolRepository],
})
export class CarpoolModule {}
