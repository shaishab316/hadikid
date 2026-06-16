import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { OTP_LENGTH } from '../auth.constant';

export const ResetPasswordSchema = z.object({
  // email: _.email({ trustCheck: false }),

  phone: _.phone(),
  otp: _.otp(OTP_LENGTH),

  newPassword: _.password({ level: 'weak' }).optional(), // optional means otp verify
});

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
