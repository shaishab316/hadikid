import { QueryDefaultSchema } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';

export const QueryChildSchema = QueryDefaultSchema;

export class QueryChildDto extends createZodDto(QueryChildSchema) {}
