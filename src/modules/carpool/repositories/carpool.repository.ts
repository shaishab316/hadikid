import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { CreateCarpoolDto } from '../dto/create-carpool.dto';
import {
  CarpoolInclude,
  CarpoolRole,
  CarpoolStatus,
  WeekdayMap,
} from '../carpool.constant';
import { resolveLocation } from '@/modules/address/address.constant';

@Injectable()
export class CarpoolRepository {
  private readonly logger = new Logger(CarpoolRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async verifyChildrenBelongToUser(
    userId: number,
    childrenIds: string[],
  ): Promise<boolean> {
    const count = await this.prisma.child.count({
      where: {
        id: { in: childrenIds },
        parentId: userId,
      },
    });

    return count === childrenIds.length;
  }

  async createCarpool(userId: number, dto: CreateCarpoolDto) {
    this.logger.log(`User ${userId} is creating a carpool`);

    const {
      title,
      notes,
      pickupAddress,
      dropoffAddress,
      date,
      repeatRule,
      selectedChildrenIds,
    } = dto;

    const byDay =
      repeatRule.weekdays && repeatRule.weekdays.length > 0
        ? repeatRule.weekdays.map((day) => WeekdayMap[day]).join(',')
        : null;

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const timeOfDay = `${hours}:${minutes}`;

    return await this.prisma.carpool.create({
      data: {
        title,
        notes,
        status: CarpoolStatus.ACTIVE,
        pickup: {
          create: resolveLocation(pickupAddress),
        },
        dropoff: {
          create: resolveLocation(dropoffAddress),
        },
        repeatRule: {
          create: {
            frequency: repeatRule.frequency,
            startDate: date,
            endDate: repeatRule.endDate ?? null,
            byDay,
            timeOfDay,
            timezone: 'UTC',
          },
        },
        members: {
          create: {
            userId,
            role: CarpoolRole.OWNER,
            children: {
              connect: selectedChildrenIds.map((id) => ({ id })),
            },
          },
        },
      },
      include: CarpoolInclude,
    });
  }
}
