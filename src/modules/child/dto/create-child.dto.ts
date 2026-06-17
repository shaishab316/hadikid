import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ChildRelationship } from '../child.constant';

export const CreateChildSchema = z.object({
  name: _.name({ field: 'Name' }),
  schoolName: z
    .string()
    .min(2, 'School name must be at least 2 characters')
    .max(100, 'School name must be at most 100 characters')
    .optional(),
  grade: z.string().max(50, 'Grade must be at most 50 characters').optional(),
  relationship: z.enum(ChildRelationship).optional(),
  photoId: z.uuid('Photo ID must be a valid UUID').optional(),
});

export class CreateChildDto extends createZodDto(CreateChildSchema) {}
