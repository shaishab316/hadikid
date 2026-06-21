import { NotificationType } from '../notification.constants';

export interface NotificationSendData {
  userIds: number[];
  message: string;
  title: string;
  type: NotificationType;
  id: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface INotificationService {
  sendNotification(data: NotificationSendData): Promise<void>;
}

export type NotificationData = {
  userIds: number[];
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  metadata?: Record<string, any>;
};
