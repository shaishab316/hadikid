import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const PrivacyPolicyUpdateSchema = z.object({
  data: _.htmlString({
    field: 'data',
    maxLength: 10000,
  }),
});

export class PrivacyPolicyUpdateDto extends createZodDto(
  PrivacyPolicyUpdateSchema,
) {}
