import { PrismaService } from '@/infra/prisma/prisma.service';
import { RedisService } from '@/infra/redis/redis.service';
import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { UnverifiedEntity } from '../interfaces/user.types';
import { LocationOmit } from '@/modules/address/address.constant';
import { imgSelect } from '@/modules/media/media.constant';

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name);
  static TEMPORARY_USER_TTL = 15 * 60; // 15 minutes in seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(data: Prisma.UserCreateInput) {
    let user = await this.prisma.user.create({
      data: {
        ...data,

        wallet: {
          create: {
            balance: 0,
          },
        },
      },
    });

    if (!user.slug) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          slug: `u-${new Date().getFullYear()}${user.id.toString().padStart(6, '0')}`,
        },
      });
    }

    this.logger.debug(`User created: ${user.id}`);
    return user;
  }

  async update(userId: number, data: Prisma.UserUpdateInput) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    this.logger.debug(`User updated: ${userId}`);
    return user;
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        profilePicture: {
          select: {
            id: true,
            url: true,
            bytes: true,
            height: true,
            width: true,
            mimeType: true,
            metadata: true,
            type: true,
          },
        },
      },
    });
  }

  async findByEmailWithAuth(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: {
        auth: true,
        roles: {
          select: {
            role: true,
          },
        },

        profilePicture: {
          select: {
            id: true,
            url: true,
            bytes: true,
            height: true,
            width: true,
            mimeType: true,
            metadata: true,
            type: true,
          },
        },
      },
    });
  }

  async findById(id: number) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          select: {
            role: true,
          },
        },
        profilePicture: {
          select: {
            id: true,
            url: true,
            bytes: true,
            height: true,
            width: true,
            mimeType: true,
            metadata: true,
            type: true,
          },
        },
      },
    });
  }

  async findByIdWithAuth(id: number) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        auth: true,
        roles: {
          select: {
            role: true,
          },
        },
      },
    });
  }

  async findByPhone(phone: string) {
    return await this.prisma.user.findUnique({
      where: { phone: phone },
    });
  }

  async findByPhoneWithAuth(phone: string) {
    return await this.prisma.user.findUnique({
      where: { phone: phone },
      include: {
        auth: true,
        roles: {
          select: {
            role: true,
          },
        },

        profilePicture: {
          select: {
            id: true,
            url: true,
            bytes: true,
            height: true,
            width: true,
            mimeType: true,
            metadata: true,
            type: true,
          },
        },
      },
    });
  }

  async checkExist({
    email,
    phone,
    username,
  }: {
    email?: string;
    phone?: string;
    username?: string;
  }) {
    const conditions = [
      email ? { email } : null,
      phone ? { phone } : null,
      username ? { username } : null,
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    if (!conditions.length) return null;

    return await this.prisma.user.findFirst({
      where: { OR: conditions },
      select: { email: true, phone: true },
    });
  }

  async createTemporary<T extends UnverifiedEntity>(userKey: string, data: T) {
    await this.redis.set(
      (ctx) => ctx.USER.TEMPORARY(userKey),
      data,
      UserRepository.TEMPORARY_USER_TTL,
    );
    this.logger.debug(`Temporary user data stored: ${userKey}`);
  }

  async getTemporary<T extends UnverifiedEntity>(userKey: string) {
    return await this.redis.get<T>((ctx) => ctx.USER.TEMPORARY(userKey));
  }

  async deleteTemporary(userKey: string) {
    await this.redis.del((ctx) => ctx.USER.TEMPORARY(userKey));
  }

  async getMe(userId: number) {
    this.logger.debug(`Fetching user profile: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          select: {
            role: true,
          },
        },

        profilePicture: {
          select: imgSelect,
        },

        location: {
          omit: LocationOmit,
        },

        // TODO: move this to school constant module
        school: {
          include: {
            banner: {
              select: imgSelect,
            },
            location: {
              omit: LocationOmit,
            },
            photo: {
              select: imgSelect,
            },
            _count: {
              select: {
                children: true,
                parents: true,
              },
            },
          },
        },

        _count: {
          select: {
            driverCarpools: true,
            children: true,
          },
        },
      },
    });

    if (!user) {
      return;
    }

    return {
      ...user,
      school: user.school
        ? {
            ...user.school,
            _count: undefined,
            childrenCount: user.school?._count.children ?? 0,
            parentsCount: user.school?._count.parents ?? 0,
          }
        : null,
      roles: user.roles.map((r) => r.role),
    };
  }

  async delete(userId: number) {
    return await this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
