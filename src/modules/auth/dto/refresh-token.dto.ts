import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const RefreshTokenSchema = z.object({
  userId: z.coerce.number().int().min(1, 'User ID must be a positive integer'),
  refreshToken: z
    .string()
    .trim()
    .length(64, 'Refresh token must be a valid 64-character hash'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
