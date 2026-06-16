import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { OTP_LENGTH } from '@/modules/auth/auth.constant';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const AccountVerifyOtpSchema = z.object({
  // email: _.email({ trustCheck: false }),

  phone: _.phone(),
  otp: _.otp(OTP_LENGTH),
});

export class AccountVerifyOtpDto extends createZodDto(AccountVerifyOtpSchema) {}
