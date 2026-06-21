import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const CreateConversationSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Group name can't exceed 100 characters")
    .optional(),
  isGroup: z.coerce.boolean().default(false),
  participantIds: z
    .array(z.coerce.number().int().positive())
    .min(1, 'At least one participant is required'),
});

export class CreateConversationDto extends createZodDto(
  CreateConversationSchema,
) {}
