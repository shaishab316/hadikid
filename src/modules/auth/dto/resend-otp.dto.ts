import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ResendOtpSchema = z.object({
  email: _.email({ trustCheck: process.env.NODE_ENV !== 'development' }),
});

export class ResendOtpDto extends createZodDto(ResendOtpSchema) {}
