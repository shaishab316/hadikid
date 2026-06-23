import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RatingRepository } from './repositories/rating.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { CarpoolRepository } from '../carpool/repositories/carpool.repository';
import { RateUserDto } from './dto/rate-user.dto';
import { RateCarpoolDto } from './dto/rate-carpool.dto';
import { QueryDefaultDto } from '@/common/dto/sharedDtoSchema';

@Injectable()
export class RatingService {
  constructor(
    private readonly ratingRepo: RatingRepository,
    private readonly userRepo: UserRepository,
    private readonly carpoolRepo: CarpoolRepository,
  ) {}

  async rateUser(reviewerId: number, dto: RateUserDto) {
    if (reviewerId === dto.subjectId) {
      throw new BadRequestException('You cannot rate yourself');
    }

    const subjectExists = await this.userRepo.findById(dto.subjectId);
    if (!subjectExists) {
      throw new NotFoundException(`User with ID ${dto.subjectId} not found`);
    }

    if (dto.carpoolId) {
      const carpoolExists = await this.carpoolRepo.getCarpoolById(
        dto.carpoolId,
      );
      if (!carpoolExists) {
        throw new NotFoundException(
          `Carpool with ID ${dto.carpoolId} not found`,
        );
      }
    }

    return await this.ratingRepo.rateUser(reviewerId, dto);
  }

  async rateCarpool(reviewerId: number, dto: RateCarpoolDto) {
    const carpoolExists = await this.carpoolRepo.getCarpoolById(dto.carpoolId);
    if (!carpoolExists) {
      throw new NotFoundException(`Carpool with ID ${dto.carpoolId} not found`);
    }

    return await this.ratingRepo.rateCarpool(reviewerId, dto);
  }

  async getMyGiveReview(userId: number, query: QueryDefaultDto) {
    const { limit, page } = query;
    const [reviews, total] = await this.ratingRepo.findReviewsGiven(
      userId,
      limit,
      page,
    );
    return { reviews, total };
  }

  async getMyReceiveReview(userId: number, query: QueryDefaultDto) {
    const { limit, page } = query;
    const [reviews, total] = await this.ratingRepo.findReviewsReceived(
      userId,
      limit,
      page,
    );
    return { reviews, total };
  }
}
