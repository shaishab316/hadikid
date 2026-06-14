import { Readable } from 'node:stream';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  attachmentType: string;
  width?: number;
  height?: number;
}

export interface UploadOptions {
  file: Express.Multer.File;
  folder?: string;
  resourceType?: 'auto' | 'image' | 'video' | 'raw';
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  async uploadFile({
    file,
    folder = 'uploads',
    resourceType = 'auto',
  }: UploadOptions): Promise<UploadResult> {
    this.logger.log(
      `📄 Uploading file: ${file.originalname} (${file.size} bytes) to folder: ${folder}`,
    );

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType },
        (error, result) => {
          if (error || !result) {
            const errorMsg = error?.message ?? 'Upload failed';
            this.logger.error(
              `❌ Upload failed for ${file.originalname}: ${errorMsg}`,
            );
            return reject(new BadRequestException(errorMsg));
          }

          resolve(result);
        },
      );

      Readable.from(file.buffer)
        .on('error', (error) => {
          this.logger.error(`❌ Stream error during upload: ${error.message}`);
          reject(new BadRequestException(`Stream error: ${error.message}`));
        })
        .pipe(uploadStream);
    });

    this.logger.log(
      `✅ File uploaded successfully: ${result.secure_url} (ID: ${result.public_id})`,
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      attachmentType: result.resource_type,
      width: result.width,
      height: result.height,
    };
  }

  async deleteFile(publicId: string): Promise<void> {
    this.logger.log(`🗑️  Deleting file: ${publicId}`);
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`✅ File deleted: ${publicId}`);
    } catch (error) {
      this.logger.error(`❌ File deletion failed for ${publicId}:`, error);
      throw error;
    }
  }

  extractPublicIdFromUrl(url: string): string {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : '';
  }
}
