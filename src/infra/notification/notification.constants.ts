import { Prisma } from '@prisma/client';

export const NOTIFICATION_QUEUE = 'hadikid-notification';
export const NOTIFICATION_JOBS = {
  SEND: 'notification.send',
} as const;
export const NOTIFICATION_SERVICE = Symbol('INotificationService');

export const NotificationType = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CONTACT_REQUEST: 'CONTACT_REQUEST',
  CONTACT_ACCEPTED: 'CONTACT_ACCEPTED',
  CARPOOL_REQUEST: 'CARPOOL_REQUEST',
  CARPOOL_UPDATED: 'CARPOOL_UPDATED',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  DRIVER_UPDATED: 'DRIVER_UPDATED',
  MESSAGE: 'MESSAGE',
} as const;

export type NotificationType = keyof typeof NotificationType;

export const NotificationSearchableFields = [
  'title',
  'message',
] as const satisfies ReadonlyArray<keyof Prisma.NotificationWhereInput>;

export const NotificationProvider = {
  FIREBASE: 'FIREBASE',
  ONE_SIGNAL: 'ONE_SIGNAL',
} as const;

export type NotificationProvider = keyof typeof NotificationProvider;
