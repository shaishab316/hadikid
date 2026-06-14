import { QueryDefaultSchema } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NotificationApp } from '../notification.constants';

export const QueryNotificationsSchema = QueryDefaultSchema.extend({
  app: z.enum(NotificationApp).default(NotificationApp.MAIN),
});

export class QueryNotificationsDto extends createZodDto(
  QueryNotificationsSchema,
) {}

export const DeleteQueryNotificationSchema = z.object({
  app: z.enum(NotificationApp).default(NotificationApp.MAIN),
});

export class DeleteQueryNotificationDto extends createZodDto(
  DeleteQueryNotificationSchema,
) {}
