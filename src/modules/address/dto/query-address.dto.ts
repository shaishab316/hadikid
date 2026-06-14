import { QueryDefaultSchema } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';

export const QueryAddressSchema = QueryDefaultSchema;

export class QueryAddressDto extends createZodDto(QueryAddressSchema) {}
