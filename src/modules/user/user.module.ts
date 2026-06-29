import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UploadModule } from '@/infra/upload/upload.module';
import { AuthRepository } from '../auth/repository/auth.repository';
import { UserRoleCommand } from './commands/user-role.command';

@Module({
  imports: [UploadModule],
  controllers: [UserController],
  providers: [UserRepository, UserService, AuthRepository, UserRoleCommand],
  exports: [UserRepository],
})
export class UserModule {}
