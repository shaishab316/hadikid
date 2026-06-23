import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { RatingRepository } from './repositories/rating.repository';
import { UserModule } from '../user/user.module';
import { CarpoolModule } from '../carpool/carpool.module';

@Module({
  imports: [UserModule, CarpoolModule],
  providers: [RatingService, RatingRepository],
  controllers: [RatingController],
  exports: [RatingService, RatingRepository],
})
export class RatingModule {}
