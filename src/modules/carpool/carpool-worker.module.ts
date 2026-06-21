import { Module } from '@nestjs/common';
import { CarpoolProcessor } from './carpool.processor';
import { CarpoolModule } from './carpool.module';

@Module({
  imports: [CarpoolModule],
  providers: [CarpoolProcessor],
})
export class CarpoolWorkerModule {}
