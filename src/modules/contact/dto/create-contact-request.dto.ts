import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateContactRequestSchema = z.object({
  receiverId: z.coerce
    .number()
    .int()
    .positive('Receiver ID must be a positive integer'),
  message: _.htmlString({
    field: 'message',
    maxLength: 5000,
  }).optional(),
});

export class CreateContactRequestDto extends createZodDto(
  CreateContactRequestSchema,
) {}
