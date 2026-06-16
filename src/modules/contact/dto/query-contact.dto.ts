import { QueryDefaultSchema } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { ContactRequestStatus } from '../contact.constant';

export const QueryContactSchema = QueryDefaultSchema;

export class QueryContactsDto extends createZodDto(QueryContactSchema) {}

//++++++++++++++++++++++++++++++++++++++++++++++++++++

export const QueryContactRequestsSchema = QueryDefaultSchema.extend({
  status: z.enum(ContactRequestStatus).default(ContactRequestStatus.PENDING),
});

export class QueryContactRequestsDto extends createZodDto(
  QueryContactRequestsSchema,
) {}
