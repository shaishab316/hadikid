import { Module } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildController } from './child.controller';

@Module({
  providers: [ChildService],
  controllers: [ChildController]
})
export class ChildModule {}
