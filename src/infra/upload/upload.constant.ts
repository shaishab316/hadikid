export const MediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  DOCUMENT: 'DOCUMENT',
} as const;

export const StorageProvider = {
  CLOUDINARY: 'CLOUDINARY',
  AWS_S3: 'AWS_S3',
  GCS: 'GCS',
  LOCAL: 'LOCAL',
  EXTERNAL: 'EXTERNAL',
} as const;
