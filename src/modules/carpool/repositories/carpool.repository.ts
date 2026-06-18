import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { CreateCarpoolDto } from '../dto/create-carpool.dto';
import { CarpoolInclude } from '../carpool.constant';

@Injectable()
export class CarpoolRepository {
  private readonly logger = new Logger(CarpoolRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async verifyChildrenBelongToUser(userId: number, childrenIds: string[]): Promise<boolean> {
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
    const { title, notes, pickupAddress, dropoffAddress, date, repeatRule, selectedChildrenIds } = dto;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create pickup and dropoff locations
      const pickup = await tx.location.create({
        data: {
          remarks: pickupAddress.remarks,
          latitude: pickupAddress.latitude,
          longitude: pickupAddress.longitude,
          addressLine1: pickupAddress.addressLine1,
          addressLine2: pickupAddress.addressLine2,
          country: pickupAddress.country,
          state: pickupAddress.state,
          city: pickupAddress.city,
          zipCode: pickupAddress.zipCode,
          note: pickupAddress.note,
        },
      });

      const dropoff = await tx.location.create({
        data: {
          remarks: dropoffAddress.remarks,
          latitude: dropoffAddress.latitude,
          longitude: dropoffAddress.longitude,
          addressLine1: dropoffAddress.addressLine1,
          addressLine2: dropoffAddress.addressLine2,
          country: dropoffAddress.country,
          state: dropoffAddress.state,
          city: dropoffAddress.city,
          zipCode: dropoffAddress.zipCode,
          note: dropoffAddress.note,
        },
      });

      // 2. Create the Carpool record
      const carpool = await tx.carpool.create({
        data: {
          title,
          notes,
          status: 'ACTIVE',
          pickupId: pickup.id,
          dropoffId: dropoff.id,
        },
      });

      // 3. Create Repeat Rule
      const weekdayMap: Record<string, string> = {
        Saturday: 'SA',
        Sunday: 'SU',
        Monday: 'MO',
        Tuesday: 'TU',
        Wednesday: 'WE',
        Thursday: 'TH',
        Friday: 'FR',
      };

      const byDay = repeatRule.weekdays && repeatRule.weekdays.length > 0
        ? repeatRule.weekdays.map(day => weekdayMap[day]).join(',')
        : null;

      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const timeOfDay = `${hours}:${minutes}`;

      await tx.carpoolRepeatRule.create({
        data: {
          carpoolId: carpool.id,
          frequency: repeatRule.frequency,
          startDate: date,
          endDate: repeatRule.endDate ?? null,
          byDay,
          timeOfDay,
          timezone: 'UTC',
        },
      });

      // 4. Create CarpoolMember (Creator as PARENT)
      await tx.carpoolMember.create({
        data: {
          carpoolId: carpool.id,
          userId,
          role: 'PARENT',
          children: {
            connect: selectedChildrenIds.map(id => ({ id })),
          },
        },
      });

      // 5. Return the complete carpool object with relations
      return await tx.carpool.findUnique({
        where: { id: carpool.id },
        include: CarpoolInclude,
      });
    });
  }
}

