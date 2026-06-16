import { NotificationType } from '../notification.constants';

export interface NotificationSendData {
  userIds: number[];
  message: string;
  title: string;
  type: NotificationType;
  id: string;
}

export interface INotificationService {
  sendNotification(data: NotificationSendData): Promise<void>;
}

export type NotificationData = {
  userIds: number[];
  title: string;
  message: string;
  type: NotificationType;
};
