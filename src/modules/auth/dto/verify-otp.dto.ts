import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const VerifyOtpSchema = z.object({
  email: _.email(),

  otp: _.otp(),

  //? The flow field indicates the context in which the OTP is being verified, allowing the backend to handle different verification flows (e.g., registration vs. password reset) appropriately.
  flow: z.enum(['register', 'forgot-password']).default('register'),
});

export type VerifyOtpFlow = z.infer<typeof VerifyOtpSchema>['flow'];

export class VerifyOtpDto extends createZodDto(VerifyOtpSchema) {}
