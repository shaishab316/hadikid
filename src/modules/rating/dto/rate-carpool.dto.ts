import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const RateCarpoolSchema = z.object({
  carpoolId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export class RateCarpoolDto extends createZodDto(RateCarpoolSchema) {}
