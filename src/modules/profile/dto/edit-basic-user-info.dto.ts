import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const BasicUserInfoEditSchema = z
  .object({
    name: _.name({ field: 'name' }),
    profilePicture: z.uuid('Profile picture is required'),
    email: _.email({ trustCheck: false }),
    address: _.address,
    bio: _.htmlString({
      field: 'bio',
      maxLength: 500,
    }),
    schoolName: _.name({
      field: 'school name',
    }),
    emergencyPhone: _.phone(),
  })
  .partial();

export class BasicUserInfoEditDto extends createZodDto(
  BasicUserInfoEditSchema,
) {}
