import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const RateUserSchema = z.object({
  subjectId: z.coerce.number().int().positive(),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  carpoolId: z.uuid().optional(),
});

export class RateUserDto extends createZodDto(RateUserSchema) {}
