import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';

export const CreateAddressSchema = _.address;

export class CreateAddressDto extends createZodDto(CreateAddressSchema) {}
