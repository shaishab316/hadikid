import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const LoginSchema = z.object({
  email: _.email({ trustCheck: process.env.NODE_ENV !== 'development' }),
  password: _.password({ level: 'weak' }),

  address: _.address.optional(),
});

export class LoginDto extends createZodDto(LoginSchema) {}
