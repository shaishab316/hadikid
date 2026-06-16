import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UpdateAliasSchema = z.object({
  alias: z
    .string()
    .trim()
    .max(100, "Alias can't exceed 100 characters")
    .nullable()
    .optional(),
});

export class UpdateAliasDto extends createZodDto(UpdateAliasSchema) {}
