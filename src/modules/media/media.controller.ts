import {
  Controller,
  Post,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UploadedFiles,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MediaService } from './media.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OptionalJwtGuard } from '@/common/guards/optional-jwt.guard';
import { createFileUploadInterceptor } from '@/infra/upload/interceptors/file-upload.interceptor';
import { type User } from '@prisma/client';
import { ApiResponse } from '@/common/types/api-response';

// ─── Upload Interceptors ──────────────────────────────────────────────────────

const ImageUploadInterceptor = createFileUploadInterceptor({
  fields: [
    {
      name: 'images',
      maxCount: 10,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/octet-stream',
      ],
    },
  ],
});

const VideoUploadInterceptor = createFileUploadInterceptor({
  fields: [
    {
      name: 'video',
      maxCount: 1,
      maxFileSize: 100 * 1024 * 1024, // 100 MB
      allowedMimeTypes: [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'application/octet-stream',
      ],
    },
  ],
});

@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  @Post('upload/images')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalJwtGuard)
  @UseInterceptors(ImageUploadInterceptor)
  @Throttle({
    default: { limit: 10, ttl: 60000 }, // 10 req/min for non-auth users
    authenticated: { limit: 30, ttl: 60000 }, // 30 req/min for auth users
  })
  async uploadImages(
    @UploadedFiles() files: { images?: Express.Multer.File[] },
    @CurrentUser() user?: User,
  ): Promise<ApiResponse> {
    if (!files?.images || files.images.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    this.logger.log(
      `Uploading ${files.images.length} image(s)${user ? ` by user ${user.id}` : '...'}`,
    );

    const images = await this.mediaService.uploadImages(files.images, user?.id);

    return {
      message: `${images.length} image(s) uploaded successfully`,
      data: images,
    };
  }

  @Post('upload/video')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalJwtGuard)
  @UseInterceptors(VideoUploadInterceptor)
  @Throttle({
    default: { limit: 10, ttl: 60000 }, // 10 req/min for non-auth users
    authenticated: { limit: 30, ttl: 60000 }, // 30 req/min for auth users
  })
  async uploadVideo(
    @UploadedFiles() files: { video?: Express.Multer.File[] },
    @CurrentUser() user?: User,
  ): Promise<ApiResponse> {
    if (!files?.video || files.video.length === 0) {
      throw new BadRequestException('No video file provided');
    }

    this.logger.log(`Uploading video${user ? ` by user ${user.id}` : '...'}`);

    const video = await this.mediaService.uploadVideo(files.video[0], user?.id);

    return {
      message: 'Video uploaded successfully',
      data: video,
    };
  }
}
