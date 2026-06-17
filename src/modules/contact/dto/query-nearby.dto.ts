import { QueryDefaultSchema } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';

export const QueryNearbyFamiliesSchema = QueryDefaultSchema;

export class QueryNearbyFamiliesDto extends createZodDto(
  QueryNearbyFamiliesSchema,
) {}
