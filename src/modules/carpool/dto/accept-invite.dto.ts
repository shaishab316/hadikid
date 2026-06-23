import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const AcceptInviteSchema = z.object({
  selectedChildrenIds: z
    .array(z.uuid())
    .min(1, 'At least one child is required'),
});

export class AcceptInviteDto extends createZodDto(AcceptInviteSchema) {}
