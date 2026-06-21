import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { CarpoolRepeatFrequency, Weekdays } from '../carpool.constant';

export const CreateCarpoolSchema = z.object({
  title: _.name({ field: 'title' }),
  notes: _.htmlString({
    field: 'notes',
    maxLength: 5000,
  }).optional(),
  pickupAddress: _.address,
  dropoffAddress: _.address,
  date: _.date(),
  repeatRule: z
    .object({
      frequency: z.enum(CarpoolRepeatFrequency),
      weekdays: z.array(z.enum(Weekdays)).optional(),
      endDate: _.date().optional(),
    })
    .refine(
      (data) =>
        data.frequency !== CarpoolRepeatFrequency.CUSTOM ||
        data.weekdays?.length,
      {
        message: 'Weekdays are required when frequency is CUSTOM',
        path: ['weekdays'],
      },
    ),
  selectedChildrenIds: z
    .array(z.uuid())
    .min(1, 'At least one child is required'),
  memberIds: z.array(z.number().int()).optional(),
});

export class CreateCarpoolDto extends createZodDto(CreateCarpoolSchema) {}
