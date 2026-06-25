import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const LoginSchema = z.object({
  // email: _.email({ trustCheck: process.env.NODE_ENV !== 'development' }),

  phone: _.phone(),
  password: _.password({ level: 'weak' }),

  address: _.address.optional(),

  pushToken: z.string().max(500).min(1).optional(),
});

export class LoginDto extends createZodDto(LoginSchema) {}
