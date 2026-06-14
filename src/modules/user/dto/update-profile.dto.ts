import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const updateProfileSchema = z.object({
  firstName: _.name({ field: 'firstName' }).optional(),
  lastName: _.name({ field: 'lastName' }).optional(),
  phone: _.phone().optional(),
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
