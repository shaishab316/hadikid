import { QueryDefaultSchema } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const QueryNotificationsSchema = QueryDefaultSchema;

export class QueryNotificationsDto extends createZodDto(
  QueryNotificationsSchema,
) {}

export const DeleteQueryNotificationSchema = z.object({});

export class DeleteQueryNotificationDto extends createZodDto(
  DeleteQueryNotificationSchema,
) {}
