import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { ChecklistStatus } from '../carpool.constant';
import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';

export const UpdateChecklistSchema = z.object({
  childId: z.uuid('Invalid childId format'),
  status: z.enum(ChecklistStatus),
  note: _.htmlString({ field: 'note', maxLength: 500 }).optional(),
});

export class UpdateChecklistDto extends createZodDto(UpdateChecklistSchema) {}
