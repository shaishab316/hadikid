import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const BasicUserInfoEditSchema = z.object({
  name: _.name({ field: 'name' }).optional(),
  profilePicture: z.uuid('Profile picture is required').optional(),
});

export class BasicUserInfoEditDto extends createZodDto(
  BasicUserInfoEditSchema,
) {}
