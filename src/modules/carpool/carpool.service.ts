import { BadRequestException, Injectable } from '@nestjs/common';
import { CarpoolRepository } from './repositories/carpool.repository';
import { CreateCarpoolDto } from './dto/create-carpool.dto';

@Injectable()
export class CarpoolService {
  constructor(private readonly carpoolRepo: CarpoolRepository) {}

  async createCarpool(userId: number, dto: CreateCarpoolDto) {
    const belong = await this.carpoolRepo.verifyChildrenBelongToUser(
      userId,
      dto.selectedChildrenIds,
    );
    if (!belong) {
      throw new BadRequestException(
        'Some selected children are invalid or do not belong to you',
      );
    }
    return this.carpoolRepo.createCarpool(userId, dto);
  }
}

