import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UploadModule } from '@/infra/upload/upload.module';
import { AuthRepository } from '../auth/repository/auth.repository';

@Module({
  imports: [UploadModule],
  controllers: [UserController],
  providers: [UserRepository, UserService, AuthRepository],
  exports: [UserRepository],
})
export class UserModule {}
