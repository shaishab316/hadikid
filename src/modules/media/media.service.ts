import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from '@/infra/upload/cloudinary.service';
import { PrismaService } from '@/infra/prisma/prisma.service';
import { Media } from '@prisma/client';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadImages(files: Express.Multer.File[], userId?: number) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    const uploadResults: Media[] = [];

    for (const file of files) {
      try {
        const result = await this.cloudinaryService.uploadFile({
          file,
          folder: 'nest-it/media/images',
          resourceType: 'image',
        });

        // Save to database
        const media = await this.prisma.media.create({
          data: {
            userId: userId || null,
            url: result.url,
            type: 'IMAGE',
            provider: 'CLOUDINARY',
            providerPublicId: result.publicId,
            mimeType: file.mimetype,
            bytes: String(file.size),
            width: result.width,
            height: result.height,
            metadata: {
              originalName: file.originalname,
            },
            ttl: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          },
        });

        uploadResults.push(media);

        this.logger.log(
          `✅ Image uploaded & saved (DB ID: ${media.id}): ${file.originalname} -> ${result.url}`,
        );
      } catch (error: any) {
        this.logger.error(
          `❌ Failed to upload image ${file.originalname}:`,
          error,
        );
        throw new BadRequestException(
          `Failed to upload ${file.originalname}: ${error.message}`,
        );
      }
    }

    return uploadResults;
  }

  async uploadVideo(file: Express.Multer.File, userId?: number) {
    if (!file) {
      throw new BadRequestException('No video file provided');
    }

    try {
      const result = await this.cloudinaryService.uploadFile({
        file,
        folder: 'nest-it/media/videos',
        resourceType: 'video',
      });

      // Generate video thumbnail/preview URL with dynamic dimensions
      // Maintain aspect ratio: scale down to ~300px width
      const previewWidth = Math.min(300, result.width || 300);
      const previewHeight = result.height
        ? Math.round((previewWidth / (result.width || 1)) * result.height)
        : 200;

      const previewUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/w_${previewWidth},h_${previewHeight},c_fill,so_0/${result.publicId}.jpg`;

      // Save to database
      const media = await this.prisma.media.create({
        data: {
          userId: userId || null,
          url: result.url,
          type: 'VIDEO',
          provider: 'CLOUDINARY',
          providerPublicId: result.publicId,
          mimeType: file.mimetype,
          bytes: String(file.size),
          width: result.width,
          height: result.height,
          previewUrl,
          metadata: {
            originalName: file.originalname,
          },
          ttl: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        },
      });

      this.logger.log(
        `✅ Video uploaded & saved (DB ID: ${media.id}): ${file.originalname} -> ${result.url}`,
      );

      return media;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to upload video ${file.originalname}:`,
        error,
      );
      throw new BadRequestException(`Failed to upload video: ${error.message}`);
    }
  }
}
