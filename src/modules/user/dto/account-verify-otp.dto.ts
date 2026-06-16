import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const AccountVerifyOtpSchema = z.object({
  // email: _.email({ trustCheck: false }),

  phone: _.phone(),
  otp: _.otp(6),
});

export class AccountVerifyOtpDto extends createZodDto(AccountVerifyOtpSchema) {}
