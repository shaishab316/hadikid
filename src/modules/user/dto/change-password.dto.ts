import { sharedDtoSchema as _ } from '@/common/dto/sharedDtoSchema';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const changePasswordSchema = z.object({
  currentPassword: _.password({ level: 'weak' }),
  newPassword: _.password({ level: 'weak' }),
});

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
