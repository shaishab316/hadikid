import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RespondContactRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export class RespondContactRequestDto extends createZodDto(
  RespondContactRequestSchema,
) {}
