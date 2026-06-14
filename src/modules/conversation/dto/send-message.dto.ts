import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const SendMessageSchema = z
  .object({
    conversationId: z.uuid().optional(),
    recipientId: z.coerce.number().int().positive().optional(),
    content: _.htmlString({ field: 'content', maxLength: 5000 }).optional(),
    attachmentIds: z.array(z.uuid()).optional(),
  })
  .refine((data) => data.conversationId || data.recipientId, {
    message: 'Either conversationId or recipientId must be provided',
    path: ['conversationId'],
  })
  .refine(
    (data) =>
      (data.content && data.content.length > 0) ||
      (data.attachmentIds && data.attachmentIds.length > 0),
    {
      message:
        'Either message content or at least one attachment must be provided',
      path: ['content'],
    },
  );

export class SendMessageDto extends createZodDto(SendMessageSchema) {}
