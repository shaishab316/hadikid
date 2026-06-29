import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development')
    .describe('Environment mode'),
  PORT: z.coerce
    .number()
    .int()
    .min(1000)
    .max(65535)
    .default(3000)
    .describe('Server port'),
  CORS_ORIGIN: z
    .preprocess(
      (val) => {
        if (val === '*') return '*';
        if (typeof val === 'string') {
          return val.split(',').map((s) => s.trim());
        }
        return val;
      },
      z.union([
        z.literal('*'),
        z.array(z.url('Each origin must be a valid URL')).nonempty(),
      ]),
    )
    .default('*')
    .describe('Allowed CORS origins'),

  // Database
  DATABASE_URL: z
    .url('DATABASE_URL must be a valid PostgreSQL connection string')
    .describe('PostgreSQL connection string'),

  // Redis
  REDIS_URL: z
    .url('REDIS_URL must be a valid Redis connection string')
    .default('redis://localhost:6379')
    .describe('Redis connection URL'),

  // JWT Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .describe('JWT signing secret'),
  JWT_EXPIRES_IN: z
    .string()
    .default('7d')
    .describe('JWT token expiration time'),

  OTP_SECRET: z
    .string()
    .min(10, 'OTP_SECRET must be at least 10 characters')
    .describe('Base secret for OTP generation'),

  // Cloudinary Media
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, 'CLOUDINARY_CLOUD_NAME is required')
    .describe('Cloudinary cloud name'),
  CLOUDINARY_API_KEY: z
    .string()
    .min(1, 'CLOUDINARY_API_KEY is required')
    .describe('Cloudinary API key'),
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, 'CLOUDINARY_API_SECRET is required')
    .describe('Cloudinary API secret'),

  // Email (Nodemailer)
  SMTP_HOST: z
    .string()
    .min(1, 'SMTP_HOST is required')
    .describe('SMTP server host'),
  SMTP_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(587)
    .describe('SMTP server port'),
  SMTP_USER: z
    .email('SMTP_USER must be a valid email')
    .describe('SMTP authentication email'),
  SMTP_PASSWORD: z
    .string()
    .min(1, 'SMTP_PASSWORD is required')
    .describe('SMTP authentication password'),
  SMTP_FROM_EMAIL: z
    .email('SMTP_FROM_EMAIL must be a valid email')
    .describe('Email sender address'),
  SMTP_FROM_NAME: z.string().default('hadikid').describe('Email sender name'),

  // Admin
  ADMIN_EMAIL: z
    .email('ADMIN_EMAIL must be a valid email')
    .describe('Admin email address'),
  ADMIN_PASSWORD: z
    .string()
    .min(6, 'ADMIN_PASSWORD must be at least 6 characters')
    .describe('Admin initial password'),

  // Optional - Logging & Analytics
  LOG_LEVEL: z
    .enum(['error', 'warn', 'log', 'debug', 'verbose'])
    .default('log')
    .describe('Logging level'),

  TEST_OTP: z
    .string()
    .describe('A fixed OTP for testing purposes, do not use in production')
    .default('1234'),

  LOKI_URL: z
    .url('LOKI_URL must be a valid URL')
    .default('http://localhost:3100')
    .describe('Loki logging server URL'),

  ONESIGNAL_API_KEY: z
    .string()
    .min(1, 'ONESIGNAL_API_KEY is required')
    .describe('OneSignal REST API key'),

  ONESIGNAL_APP_ID: z
    .string()
    .min(1, 'ONESIGNAL_APP_ID is required')
    .describe('OneSignal App ID'),

  // Protected Routes (Docs & Queues)
  DOCS_USERNAME: z
    .string()
    .min(1, 'DOCS_USERNAME is required for protecting /docs')
    .describe('Username for API documentation access'),
  DOCS_PASSWORD: z
    .string()
    .min(6, 'DOCS_PASSWORD must be at least 6 characters')
    .describe('Password for API documentation access'),
  QUEUES_USERNAME: z
    .string()
    .min(1, 'QUEUES_USERNAME is required for protecting /queues')
    .describe('Username for Bull Board queue admin access'),
  QUEUES_PASSWORD: z
    .string()
    .min(6, 'QUEUES_PASSWORD must be at least 6 characters')
    .describe('Password for Bull Board queue admin access'),
});

export const validate = (config: Record<string, unknown>) => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.message}`);
  }

  return result.data;
};

export type Env = z.infer<typeof envSchema>;
