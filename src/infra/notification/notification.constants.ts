import { Prisma } from '@prisma/client';

export const NOTIFICATION_QUEUE = 'hadikid-notification';
export const NOTIFICATION_JOBS = {
  SEND: 'notification.send',
} as const;
export const NOTIFICATION_SERVICE = Symbol('INotificationService');

export const NotificationType = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CONTACT_REQUEST: 'CONTACT_REQUEST',
  CARPOOL_REQUEST: 'CARPOOL_REQUEST',
  CARPOOL_UPDATED: 'CARPOOL_UPDATED',
  MESSAGE: 'MESSAGE',
};
export type NotificationType = keyof typeof NotificationType;

export const NotificationSearchableFields = [
  'title',
  'message',
] as const satisfies ReadonlyArray<keyof Prisma.NotificationWhereInput>;
