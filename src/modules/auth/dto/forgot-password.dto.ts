import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const ForgotPasswordSchema = z.object({
  // email: _.email({ trustCheck: process.env.NODE_ENV !== 'development' }),
  phone: _.phone(),
});

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
