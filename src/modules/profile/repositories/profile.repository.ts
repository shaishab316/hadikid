import { PrismaService } from '@/infra/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Contact, Prisma } from '@prisma/client';
import { resolveLocation } from '@/modules/address/address.constant';
import { calculateDistanceInKm } from '@/common/helpers/calculateDistance';
import { imgSelect } from '@/modules/media/media.constant';
import { LocationOmit } from '@/modules/address/address.constant';
import { BasicUserInfoEditDto } from '../dto/edit-basic-user-info.dto';
import { ContactRepository } from '@/modules/contact/repositories/contact.repository';
import { UserSelect } from '@/modules/user/user.constant';

@Injectable()
export class ProfileRepository {
  private readonly logger = new Logger(ProfileRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contactRepo: ContactRepository,
  ) {}

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

  async getUserProfileById(currentUserId: number, targetUserId: number) {
    this.logger.debug(
      `Fetching profile details for target user ${targetUserId} by current user ${currentUserId}`,
    );

    let contact: Contact | null = null;

    if (currentUserId !== targetUserId) {
      contact = await this.contactRepo.findContactBetweenUsersMinimal(
        currentUserId,
        targetUserId,
      );

      if (contact?.isBlocked) {
        throw new BadRequestException('This user profile is unavailable.');
      }
    }

    this.logger.debug(
      `[getUserProfileById] Contact id: ${contact?.id} between user1: ${currentUserId} and user2: ${targetUserId}`,
    );

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        ...UserSelect,
        school: {
          include: {
            banner: { select: imgSelect },
            photo: { select: imgSelect },
            location: { omit: LocationOmit },
          },
        },
        children: {
          include: {
            photo: { select: imgSelect },
            school: { select: { id: true, name: true } },
          },
        },
        reviewsReceived: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                profilePicture: { select: imgSelect },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            children: true,
            carpoolMembers: true,
          },
        },
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User profile not found.');
    }

    // Fetch current user's location coordinates for distance calculation
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        location: {
          select: {
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    let distanceKm: number | null = null;
    if (
      currentUser?.location?.latitude != null &&
      currentUser?.location?.longitude != null &&
      targetUser.location?.latitude != null &&
      targetUser.location?.longitude != null
    ) {
      const rawDistance = calculateDistanceInKm(
        {
          lat: currentUser.location.latitude,
          lon: currentUser.location.longitude,
        },
        {
          lat: targetUser.location.latitude,
          lon: targetUser.location.longitude,
        },
      );
      distanceKm = Math.round(rawDistance * 100) / 100;
    }

    let isRequestSender = false;

    const contactRequest = await this.prisma.contactRequest.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId },
        ],
      },
      select: {
        status: true,
        senderId: true,
      },
    });

    if (contactRequest) {
      isRequestSender = contactRequest.senderId === currentUserId;
    }

    const { _count, ...restUser } = targetUser;

    return {
      ...restUser,
      childrenCount: _count.children,
      carpoolCount: _count.carpoolMembers,
      distanceKm,
      isRequestSender,
      isFriend: !!contact,
    };
  }
}
