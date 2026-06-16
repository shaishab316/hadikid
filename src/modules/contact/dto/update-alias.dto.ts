import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateAliasSchema = z.object({
  alias: _.name({
    field: 'alias',
  })
    .nullable()
    .optional(),
});

export class UpdateAliasDto extends createZodDto(UpdateAliasSchema) {}
