export interface ConversationCreatedEvent {
  mappedConversations: { pId: number; mapped: any }[];
}

export interface ConversationMessageSentEvent {
  targetConversationId: string;
  message: any;
}

export interface ConversationMessagesSeenEvent {
  senderIds: number[];
  conversationId: string;
  userId: number;
  lastMessageId: string;
}

export interface ConversationMessagesDeliveredEvent {
  senderIds: number[];
  conversationId: string;
  userId: number;
}
