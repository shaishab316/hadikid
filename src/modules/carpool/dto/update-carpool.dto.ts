import { createZodDto } from 'nestjs-zod';
import { CreateCarpoolSchema } from './create-carpool.dto';

export const UpdateCarpoolSchema = CreateCarpoolSchema.pick({
  title: true,
  notes: true,
  pickupAddress: true,
  dropoffAddress: true,
}).partial();

export class UpdateCarpoolDto extends createZodDto(UpdateCarpoolSchema) {}
