import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { CreateAddressDto } from '../dto/create-address.dto';
import {
  LocationSearchableFields,
  SavedLocationDefaultInclude,
} from '../address.constant';
import { QueryAddressDto } from '../dto/query-address.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AddressRepository {
  private readonly logger = new Logger(AddressRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAddress(userId: number, dto: CreateAddressDto) {
    const {
      remarks,
      latitude,
      longitude,
      addressLine1,
      addressLine2,
      city,
      country,
      note,
      state,
      zipCode,
    } = dto;

    return await this.prisma.savedLocation.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        location: {
          create: {
            remarks,
            latitude,
            longitude,
            addressLine1,
            addressLine2,
            city,
            country,
            note,
            state,
            zipCode,
          },
        },
        remarks,
      },
      include: SavedLocationDefaultInclude,
    });
  }

  async queryAddress(userId: number, query: QueryAddressDto) {
    this.logger.debug(`Query saved  address for user ${userId}`);

    const { page, limit, search } = query;

    const where: Prisma.SavedLocationWhereInput = {
      userId,
    };

    if (search) {
      where.location = {
        OR: LocationSearchableFields.map((field) => ({
          [field]: {
            contains: search,
            mode: 'insensitive',
          },
        })),
      };
    }

    return await Promise.all([
      this.prisma.savedLocation.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        include: SavedLocationDefaultInclude,
      }),
      this.prisma.savedLocation.count({ where }),
    ]);
  }

  async deleteAddress(userId: number, addressId: string) {
    this.logger.debug(`Delete address ${addressId} for user ${userId}`);

    return await this.prisma.savedLocation.delete({
      where: {
        userId_locationId: {
          locationId: addressId,
          userId,
        },
      },
      include: SavedLocationDefaultInclude,
    });
  }
}
