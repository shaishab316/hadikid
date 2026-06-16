import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const ResendAccountVerifyOtpSchema = z.object({
  phone: _.phone(),
});

export class ResendAccountVerifyOtpDto extends createZodDto(ResendAccountVerifyOtpSchema) {}
