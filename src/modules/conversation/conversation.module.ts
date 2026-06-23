import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { ConversationRepository } from './repositories/conversation.repository';
import { UserModule } from '../user/user.module';
import { ContactRepository } from '../contact/repositories/contact.repository';
import { ConversationListener } from './conversation.listener';

@Module({
  imports: [UserModule],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    ConversationRepository,
    ContactRepository,
    ConversationListener,
  ],
  exports: [ConversationService, ConversationRepository, ConversationListener],
})
export class ConversationModule {}
