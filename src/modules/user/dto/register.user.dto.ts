import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

/**
 *! User register DTO and schema.
 */

export const UserRegisterSchema = z.object({
  firstName: _.name({ field: 'First Name' }),
  lastName: _.name({ field: 'Last Name' }),
  email: _.email({ trustCheck: false }).optional(),
  phone: _.phone(),
  password: _.password({ level: 'weak' }),
});

export class UserRegisterDto extends createZodDto(UserRegisterSchema) {}
