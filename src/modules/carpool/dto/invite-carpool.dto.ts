import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const InviteMemberSchema = z.object({
  userId: z.number().int().positive(),
  message: _.htmlString({ field: 'message', maxLength: 500 }).optional(),
});

export class InviteMemberDto extends createZodDto(InviteMemberSchema) {}
