import { BadRequestException, Logger } from '@nestjs/common';
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

const extensionToMime: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
};

// ─── File Filter ──────────────────────────────────────────────────────────────

const logger = new Logger('FileUploadInterceptor');

const createFileFilter = (config: FileUploadConfig) => {
  const fieldMap = new Map(
    config.fields.map((f) => [f.name, resolveField(f, config)]),
  );

  return (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    const originalMimetype = file.mimetype;

    // Resolve mimetype from file extension if generic/unset (common in Flutter/mobile clients)
    if (
      (!file.mimetype || file.mimetype === 'application/octet-stream') &&
      file.originalname
    ) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (ext && ext in extensionToMime) {
        file.mimetype = extensionToMime[ext];
        logger.debug(
          `[${file.fieldname}] "${file.originalname}" — mimetype resolved from "${originalMimetype}" → "${file.mimetype}" via extension ".${ext}"`,
        );
      } else {
        logger.warn(
          `[${file.fieldname}] "${file.originalname}" — mimetype is "${originalMimetype}" and extension could not be mapped (ext: "${ext ?? 'none'}")`,
        );
      }
    } else {
      logger.debug(
        `[${file.fieldname}] "${file.originalname}" — mimetype: "${file.mimetype}"`,
      );
    }

    const field = fieldMap.get(file.fieldname);

    if (!field) {
      const reason = `Unexpected field: "${file.fieldname}"`;
      logger.warn(`[400] ${reason}`);
      return cb(new BadRequestException(reason));
    }

    if (!field.allowedMimeTypes.includes(file.mimetype)) {
      const reason = `"${file.fieldname}" does not accept "${file.mimetype}" — allowed: [${field.allowedMimeTypes.join(', ')}]`;
      logger.warn(`[400] ${reason}`);
      return cb(
        new BadRequestException(
          `"${file.fieldname}" does not accept "${file.mimetype}"`,
        ),
      );
    }

    logger.debug(`[${file.fieldname}] "${file.originalname}" — accepted ✓`);
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
