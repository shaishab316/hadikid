import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SocketGateway } from '@/infra/socket/socket.gateway';
import { ConversationEvent } from './conversation.constant';
import type {
  ConversationCreatedEvent,
  ConversationMessageSentEvent,
  ConversationMessagesSeenEvent,
  ConversationMessagesDeliveredEvent,
} from './conversation.interface';

@Injectable()
export class ConversationListener {
  private readonly logger = new Logger(ConversationListener.name);

  constructor(private readonly socketGateway: SocketGateway) {}

  @OnEvent(ConversationEvent.CREATED)
  onConversationCreated(payload: ConversationCreatedEvent) {
    const { mappedConversations } = payload;
    for (const item of mappedConversations) {
      this.socketGateway.emit(
        `user:${item.pId}`,
        'conversation_created',
        item.mapped,
      );
    }
  }

  @OnEvent(ConversationEvent.MESSAGE_SENT)
  onMessageSent(payload: ConversationMessageSentEvent) {
    const { targetConversationId, message } = payload;

    this.socketGateway.emit(
      '*',
      `chat:${targetConversationId}:new_message`,
      message,
    );

    this.socketGateway.emit(
      '*',
      `chat:${targetConversationId}:deliver_ack_request`,
      { messageId: message.id, conversationId: targetConversationId },
    );
  }

  @OnEvent(ConversationEvent.MESSAGES_SEEN)
  onMessagesSeen(payload: ConversationMessagesSeenEvent) {
    const { senderIds, conversationId, userId, lastMessageId } = payload;

    senderIds.forEach((senderId) => {
      this.socketGateway.emit(`user:${senderId}`, 'messages_seen', {
        conversationId,
        seenByUserId: userId,
        lastSeenMessageId: lastMessageId,
        seenAt: new Date(),
      });
    });
  }

  @OnEvent(ConversationEvent.MESSAGES_DELIVERED)
  onMessagesDelivered(payload: ConversationMessagesDeliveredEvent) {
    const { senderIds, conversationId, userId } = payload;

    senderIds.forEach((senderId) => {
      this.socketGateway.emit(`user:${senderId}`, 'messages_delivered', {
        conversationId,
        deliveredToUserId: userId,
        deliveredAt: new Date(),
      });
    });
  }
}
