import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactRepository } from './repositories/contact.repository';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '@/infra/notification/notification.module';

@Module({
  imports: [UserModule, NotificationModule],
  controllers: [ContactController],
  providers: [ContactService, ContactRepository],
  exports: [ContactService, ContactRepository],
})
export class ContactModule {}
