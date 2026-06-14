import { Prisma } from '@prisma/client';

export const NOTIFICATION_QUEUE = 'nest-it-notification';
export const NOTIFICATION_JOBS = {
  SEND: 'notification.send',
} as const;
export const NOTIFICATION_SERVICE = Symbol('INotificationService');

export const NotificationType = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
};
export type NotificationType = keyof typeof NotificationType;

export const NotificationApp = {
  MAIN: 'MAIN',

  FOOD: 'FOOD',
  RIDE: 'RIDE',
  RIDER: 'RIDER',

  //...more
};
export type NotificationApp = keyof typeof NotificationApp;

export const NotificationSearchableFields = [
  'title',
  'message',
] as const satisfies ReadonlyArray<keyof Prisma.NotificationWhereInput>;
