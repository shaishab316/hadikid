import { createZodDto } from 'nestjs-zod';
import { QueryDefaultSchema } from '@/common/dto/sharedDtoSchema';
import z from 'zod';

export class QueryConversationDto extends createZodDto(QueryDefaultSchema) {}

export const QueryMessageSchema = z.object({
  cursor: z.uuid().optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be a positive integer')
    .max(100, 'Limit must be at most 100')
    .default(20),
});

export class QueryMessageDto extends createZodDto(QueryMessageSchema) {}
