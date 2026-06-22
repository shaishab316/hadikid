import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const UpdateVehicleLocationSchema = z.object({
  latitude: _.latitude,
  longitude: _.longitude,
});

export class UpdateVehicleLocationDto extends createZodDto(
  UpdateVehicleLocationSchema,
) {}
