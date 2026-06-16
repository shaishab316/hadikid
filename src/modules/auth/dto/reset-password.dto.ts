import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const ResetPasswordSchema = z.object({
  // email: _.email({ trustCheck: false }),

  phone: _.phone(),
  otp: _.otp(6),

  newPassword: _.password({ level: 'weak' }).optional(), // optional means otp verify
});

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
