import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolveLocation } from '@/modules/address/address.constant';
import { BasicUserInfoEditDto } from '../dto/edit-basic-user-info.dto';

@Injectable()
export class ProfileRepository {
  private readonly logger = new Logger(ProfileRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async basicUserInfoEditById(userId: number, dto: BasicUserInfoEditDto) {
    this.logger.debug(`Basic user info edit for user ${userId}`);

    const {
      name,
      profilePicture,
      email,
      address,
      bio,
      schoolName,
      emergencyPhone,
    } = dto;

    const data: Prisma.UserUpdateInput = {
      name,
      publicEmail: email,
      bio,
      emergencyPhone,
    };

    if (profilePicture) {
      data.profilePicture = {
        connect: {
          id: profilePicture,
        },
      };
    }

    if (address) {
      const locationData = resolveLocation(address);
      data.location = {
        upsert: {
          create: locationData,
          update: locationData,
        },
      };
    }

    if (schoolName) {
      data.school = {
        connectOrCreate: {
          where: { name: schoolName },
          create: { name: schoolName },
        },
      };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
