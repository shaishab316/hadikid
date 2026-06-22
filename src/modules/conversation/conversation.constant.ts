import { Prisma } from '@prisma/client';
import { UserSelect } from '../user/user.constant';
import { imgSelect } from '../media/media.constant';

export const ParticipantInclude: Prisma.ConversationParticipantInclude = {
  user: {
    select: {
      ...UserSelect,
      location: false,
    },
  },
};

export const MessageInclude: Prisma.ConversationMessageInclude = {
  sender: {
    select: {
      ...UserSelect,
      location: false,
    },
  },
  attachments: {
    select: imgSelect,
  },
};

export const ConversationInclude: Prisma.ConversationInclude = {
  image: {
    select: imgSelect,
  },
  participants: {
    select: {
      userId: true,
      role: true,
      unreadCount: true,
      user: {
        select: {
          id: true,
          slug: true,
          name: true,
          profilePicture: {
            select: imgSelect,
          },
        },
      },
    },
  },
  lastMessage: {
    include: MessageInclude,
  },
};

export const ConversationParticipantRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export type ConversationParticipantRole =
  keyof typeof ConversationParticipantRole;

export const ConversationMessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  FILE: 'FILE',
  SYSTEM: 'SYSTEM',
} as const;

export type ConversationMessageType = keyof typeof ConversationMessageType;

export const ConversationMessageStatus = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  SEEN: 'SEEN',
} as const;

export type ConversationMessageStatus = keyof typeof ConversationMessageStatus;
