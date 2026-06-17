import { createZodDto } from 'nestjs-zod';
import { CreateChildSchema } from './create-child.dto';

export const UpdateChildSchema = CreateChildSchema.partial();

export class UpdateChildDto extends createZodDto(UpdateChildSchema) {}
