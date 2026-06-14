import { BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type multer from 'multer';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'
  | 'video/mp4'
  | 'application/pdf'
  | (string & {});

export interface FieldConfig {
  name: string;
  maxCount?: number;
  maxFileSize?: number;
  allowedMimeTypes?: MimeType[];
}

export interface FileUploadConfig {
  fields: [FieldConfig, ...FieldConfig[]];
  maxFileSize?: number;
  allowedMimeTypes?: MimeType[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  maxFileSize: 5 * 1024 * 1024, // 5 MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
  ] as MimeType[],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveField = (field: FieldConfig, config: FileUploadConfig) => ({
  allowedMimeTypes:
    field.allowedMimeTypes ??
    config.allowedMimeTypes ??
    DEFAULTS.allowedMimeTypes,
  maxFileSize: field.maxFileSize ?? config.maxFileSize ?? DEFAULTS.maxFileSize,
});

const strictestSizeCap = (config: FileUploadConfig) =>
  Math.min(
    ...config.fields.map(
      (f) => f.maxFileSize ?? config.maxFileSize ?? DEFAULTS.maxFileSize,
    ),
  );

// ─── File Filter ──────────────────────────────────────────────────────────────

const createFileFilter = (config: FileUploadConfig) => {
  const fieldMap = new Map(
    config.fields.map((f) => [f.name, resolveField(f, config)]),
  );

  return (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    const field = fieldMap.get(file.fieldname);

    if (!field)
      return cb(
        new BadRequestException(`Unexpected field: "${file.fieldname}"`),
      );

    if (!field.allowedMimeTypes.includes(file.mimetype))
      return cb(
        new BadRequestException(
          `"${file.fieldname}" does not accept "${file.mimetype}"`,
        ),
      );

    cb(null, true);
  };
};

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createFileUploadInterceptor = (config: FileUploadConfig) =>
  FileFieldsInterceptor(
    config.fields.map(({ name, maxCount = 1 }) => ({ name, maxCount })),
    {
      storage: memoryStorage(),
      limits: { fileSize: strictestSizeCap(config) },
      fileFilter: createFileFilter(config) as any,
    },
  );
