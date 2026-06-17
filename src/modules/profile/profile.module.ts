import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { ProfileRepository } from './repositories/profile.repository';
import { ContactRepository } from '../contact/repositories/contact.repository';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, ProfileRepository, ContactRepository],
})
export class ProfileModule {}
