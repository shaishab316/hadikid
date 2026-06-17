import { Module } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildController } from './child.controller';
import { ChildRepository } from './repositories/child.repository';

@Module({
  controllers: [ChildController],
  providers: [ChildService, ChildRepository],
  exports: [ChildService, ChildRepository],
})
export class ChildModule {}
