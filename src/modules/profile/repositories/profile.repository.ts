import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { BasicUserInfoEditDto } from '../dto/edit-basic-user-info.dto';

@Injectable()
export class ProfileRepository {
  private readonly logger = new Logger(ProfileRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async basicUserInfoEditById(userId: number, dto: BasicUserInfoEditDto) {
    this.logger.debug(`Basic user info edit for user ${userId}`);

    const { name, profilePicture } = dto;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        profilePicture: {
          connect: {
            id: profilePicture,
          },
        },
      },
    });
  }
}
