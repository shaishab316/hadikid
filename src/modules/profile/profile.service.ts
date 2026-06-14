import { Injectable } from '@nestjs/common';
import { ProfileRepository } from './repositories/profile.repository';
import { BasicUserInfoEditDto } from './dto/edit-basic-user-info.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async basicUserInfoEditById(userId: number, dto: BasicUserInfoEditDto) {
    return this.profileRepository.basicUserInfoEditById(userId, dto);
  }
}
