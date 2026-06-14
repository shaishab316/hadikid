import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

/**
 *! User register DTO and schema.
 */

export const UserRegisterSchema = z.object({
  name: _.name({ field: 'name' }),
  email: _.email({ trustCheck: false }),
  password: _.password({ level: 'weak' }),
});

export class UserRegisterDto extends createZodDto(UserRegisterSchema) {}
