import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const UpdateVehicleLocationSchema = z.object({
  carpoolId: z.uuid('Carpool ID is required'),
  roundId: z.uuid('Round ID is required'),
  latitude: _.latitude,
  longitude: _.longitude,
});

export class UpdateVehicleLocationDto extends createZodDto(
  UpdateVehicleLocationSchema,
) {}
