import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { resolveLocation } from '@/modules/address/address.constant';
import {
  CarpoolInclude,
  CarpoolSelectForInvited,
  CarpoolInviteSelectForOutgoing,
  CarpoolInviteStatus,
  CarpoolRole,
  CarpoolSearchableFields,
  CarpoolStatus,
  ChecklistStatus,
  RoundInclude,
  RoundStatus,
  RoundType,
  WeekdayMap,
} from '../carpool.constant';
import { CreateCarpoolDto } from '../dto/create-carpool.dto';
import { UpdateCarpoolDto } from '../dto/update-carpool.dto';
import { InviteMemberDto } from '../dto/invite-carpool.dto';
import { UpdateChecklistBatchDto } from '../dto/checklist-update.dto';
import { QueryDefaultDto } from '@/common/dto/sharedDtoSchema';
import { Prisma } from '@prisma/client';
import { calculateDistanceInKm } from '@/common/helpers';

@Injectable()
export class CarpoolRepository {
  private readonly logger = new Logger(CarpoolRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCarpoolById(carpoolId: string) {
    return await this.prisma.carpool.findUnique({
      where: {
        id: carpoolId,
      },
    });
  }

  async getMyCarpools(userId: number, query: QueryDefaultDto) {
    const { limit, page, search } = query;

    const where: Prisma.CarpoolWhereInput = {
      isDeleted: false,
      members: {
        some: {
          userId,
          leftAt: null,
        },
      },
    };

    if (search) {
      where.OR = CarpoolSearchableFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    return await Promise.all([
      this.prisma.carpool.findMany({
        where,
        include: CarpoolInclude,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.carpool.count({ where }),
    ]);
  }

  async getIncomingInvites(userId: number, query: QueryDefaultDto) {
    const { limit, page, search } = query;

    const location = await this.prisma.location.findUnique({
      where: {
        userId,
      },
    });

    const where: Prisma.CarpoolInviteWhereInput = {
      userId,
      status: CarpoolInviteStatus.PENDING,
      carpool: {
        isDeleted: false,
      },
    };

    if (search) {
      where.carpool = {
        isDeleted: false,
        title: { contains: search, mode: 'insensitive' },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.carpoolInvite.findMany({
        where,
        select: {
          carpool: {
            select: CarpoolSelectForInvited,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.carpoolInvite.count({ where }),
    ]);

    return [
      data.map(({ carpool: { members, ...carpool } }) => {
        let distanceKm = 0;

        if (
          location?.latitude != null &&
          location?.longitude != null &&
          carpool.pickup?.latitude != null &&
          carpool.pickup?.longitude != null
        ) {
          const rawDistance = calculateDistanceInKm(
            {
              lat: location.latitude,
              lon: location.longitude,
            },
            {
              lat: carpool.pickup.latitude,
              lon: carpool.pickup.longitude,
            },
          );
          distanceKm = Math.round(rawDistance * 100) / 100;
        }

        return {
          ...carpool,
          owner: members[0].user,
          distanceKm,
        };
      }),
      total,
    ];
  }

  async getOutgoingInvites(userId: number, query: QueryDefaultDto) {
    const { limit, page, search } = query;

    const where: Prisma.CarpoolInviteWhereInput = {
      carpool: {
        isDeleted: false,
        members: {
          some: {
            userId,
            role: CarpoolRole.OWNER,
          },
        },
      },
    };

    if (search) {
      where.OR = [
        {
          carpool: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.carpoolInvite.findMany({
        where,
        select: CarpoolInviteSelectForOutgoing,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.carpoolInvite.count({ where }),
    ]);

    return [
      data.map(({ carpool, user }) => ({
        ...carpool,
        user,
      })),
      total,
    ];
  }

  async verifyChildrenBelongToUser(userId: number, childrenIds: string[]) {
    const count = await this.prisma.child.count({
      where: { id: { in: childrenIds }, parentId: userId },
    });

    return count === childrenIds.length;
  }

  async getMemberUserIds(carpoolId: string): Promise<number[]> {
    const members = await this.prisma.carpoolMember.findMany({
      where: { carpoolId, leftAt: null },
      select: { userId: true },
    });

    return members.map((m) => m.userId);
  }

  async isMember(carpoolId: string, userId: number) {
    return this.prisma.carpoolMember.findUnique({
      where: { carpoolId_userId: { carpoolId, userId }, leftAt: null } as any,
    });
  }

  async isContact(userId1: number, userId2: number) {
    return this.prisma.contact.findFirst({
      where: {
        OR: [
          { userId1, userId2, isBlocked: false },
          { userId1: userId2, userId2: userId1, isBlocked: false },
        ],
      },
    });
  }

  async getCarpool(carpoolId: string) {
    return this.prisma.carpool.findUnique({
      where: { id: carpoolId, isDeleted: false },
      include: CarpoolInclude,
    });
  }

  async getCarpoolConversationId(carpoolId: string): Promise<string | null> {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
    });

    if (!carpool) {
      throw new Error(`Carpool not found`);
    }

    return carpool.conversationId;
  }

  async createCarpool(userId: number, dto: CreateCarpoolDto) {
    const {
      title,
      notes,
      pickupAddress,
      dropoffAddress,
      date,
      repeatRule,
      selectedChildrenIds,
    } = dto;

    const byDay = repeatRule.weekdays?.length
      ? repeatRule.weekdays.map((d) => WeekdayMap[d]).join(',')
      : null;

    const timeOfDay = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;

    return this.prisma.carpool.create({
      data: {
        title,
        notes,
        status: CarpoolStatus.ACTIVE,
        pickup: { create: resolveLocation(pickupAddress) },
        dropoff: { create: resolveLocation(dropoffAddress) },
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
            children: { connect: selectedChildrenIds.map((id) => ({ id })) },
          },
        },
      },
      include: CarpoolInclude,
    });
  }

  async updateCarpool(carpoolId: string, dto: UpdateCarpoolDto) {
    const { pickupAddress, dropoffAddress, notes, title } = dto;

    return this.prisma.carpool.update({
      where: { id: carpoolId },
      data: {
        notes,
        title,
        ...(pickupAddress && {
          pickup: { update: resolveLocation(pickupAddress) },
        }),
        ...(dropoffAddress && {
          dropoff: { update: resolveLocation(dropoffAddress) },
        }),
      },
      include: CarpoolInclude,
    });
  }

  async softDeleteCarpool(carpoolId: string) {
    return this.prisma.carpool.update({
      where: { id: carpoolId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: CarpoolStatus.CANCELLED,
      },
    });
  }

  async assignDriver(carpoolId: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const carpool = await tx.carpool.update({
        where: { id: carpoolId },
        data: { driverId: userId },
        include: CarpoolInclude,
      });

      await tx.carpoolRound.updateMany({
        where: {
          carpoolId,
          status: RoundStatus.SCHEDULED,
          driverId: null,
        },
        data: {
          driverId: userId,
        },
      });

      return carpool;
    });
  }

  async resignDriver(carpoolId: string) {
    return this.prisma.carpool.update({
      where: { id: carpoolId },
      data: { driverId: null },
    });
  }

  async createInvite(
    carpoolId: string,
    invitedByUserId: number,
    dto: InviteMemberDto,
  ) {
    return this.prisma.carpoolInvite.create({
      data: {
        carpoolId,
        userId: dto.userId,
        status: CarpoolInviteStatus.PENDING,
        message: dto.message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async withdrawInvite(carpoolId: string, invitedUserId: number) {
    return this.prisma.carpoolInvite.delete({
      where: { carpoolId_userId: { carpoolId, userId: invitedUserId } },
    });
  }

  async acceptInvite(
    carpoolId: string,
    userId: number,
    selectedChildrenIds: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.carpoolInvite.findUnique({
        where: { carpoolId_userId: { carpoolId, userId } },
      });

      if (!invite || invite.status !== CarpoolInviteStatus.PENDING) {
        throw new BadRequestException(
          'Invitation is not pending or does not exist',
        );
      }

      await tx.carpoolInvite.update({
        where: { carpoolId_userId: { carpoolId, userId } },
        data: { status: CarpoolInviteStatus.ACCEPTED },
      });

      const member = await tx.carpoolMember.create({
        data: {
          carpoolId,
          userId,
          role: CarpoolRole.MEMBER,
          children: { connect: selectedChildrenIds.map((id) => ({ id })) },
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      // Update checklists for scheduled rounds
      const scheduledRounds = await tx.carpoolRound.findMany({
        where: { carpoolId, status: RoundStatus.SCHEDULED },
        select: { id: true },
      });

      for (const round of scheduledRounds) {
        for (const childId of selectedChildrenIds) {
          await tx.carpoolRoundPickupChecklist.create({
            data: {
              roundId: round.id,
              memberId: member.id,
              childId,
              status: ChecklistStatus.PENDING,
            },
          });

          await tx.carpoolRoundDropoffChecklist.create({
            data: {
              roundId: round.id,
              memberId: member.id,
              childId,
              status: ChecklistStatus.PENDING,
            },
          });
        }
      }

      const carpool = await tx.carpool.findUnique({
        where: { id: carpoolId },
        select: { conversationId: true },
      });

      if (carpool?.conversationId) {
        await tx.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: carpool.conversationId,
              userId,
            },
          },
          create: {
            conversationId: carpool.conversationId,
            userId,
            role: 'MEMBER',
          },
          update: {
            leftAt: null,
            unreadCount: 0,
          },
        });
      }

      return member;
    });
  }

  async declineInvite(carpoolId: string, userId: number) {
    return this.prisma.carpoolInvite.update({
      where: { carpoolId_userId: { carpoolId, userId } },
      data: { status: CarpoolInviteStatus.DECLINED },
    });
  }

  async memberLeave(carpoolId: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark member as left
      const member = await tx.carpoolMember.update({
        where: { carpoolId_userId: { carpoolId, userId } },
        data: { leftAt: new Date() },
        include: { children: { select: { id: true } } },
      });

      // 2. If the user was the driver of the carpool, remove them
      const carpool = await tx.carpool.findUnique({
        where: { id: carpoolId },
        select: { driverId: true },
      });

      if (carpool?.driverId === userId) {
        await tx.carpool.update({
          where: { id: carpoolId },
          data: { driverId: null },
        });
      }

      // 3. For scheduled rounds, if this user was the driver, set driverId to null
      await tx.carpoolRound.updateMany({
        where: { carpoolId, status: RoundStatus.SCHEDULED, driverId: userId },
        data: { driverId: null },
      });

      // 4. Delete checklist entries for this member's children in scheduled rounds
      const childIds = member.children.map((c) => c.id);
      if (childIds.length > 0) {
        await tx.carpoolRoundPickupChecklist.deleteMany({
          where: {
            round: { carpoolId, status: RoundStatus.SCHEDULED },
            childId: { in: childIds },
          },
        });

        await tx.carpoolRoundDropoffChecklist.deleteMany({
          where: {
            round: { carpoolId, status: RoundStatus.SCHEDULED },
            childId: { in: childIds },
          },
        });
      }

      return member;
    });
  }

  async createRound(
    carpoolId: string,
    scheduledAt: Date,
    type: RoundType,
    driverId?: number,
  ) {
    const carpool = await this.prisma.carpool.findUnique({
      where: { id: carpoolId },
      include: {
        members: {
          where: { leftAt: null },
          include: { children: { select: { id: true } } },
        },
      },
    });

    if (!carpool) throw new Error(`Carpool ${carpoolId} not found`);

    return this.prisma.carpoolRound.create({
      data: {
        carpoolId,
        type,
        status: RoundStatus.SCHEDULED,
        scheduledAt,
        driverId: driverId ?? carpool.driverId,
        pickupChecklists: {
          create: carpool.members.flatMap((m) =>
            m.children.map((c) => ({
              memberId: m.id,
              childId: c.id,
              status: ChecklistStatus.PENDING,
            })),
          ),
        },
        dropoffChecklists: {
          create: carpool.members.flatMap((m) =>
            m.children.map((c) => ({
              memberId: m.id,
              childId: c.id,
              status: ChecklistStatus.PENDING,
            })),
          ),
        },
      },
      include: RoundInclude,
    });
  }

  async startRound(roundId: string) {
    return this.prisma.carpoolRound.update({
      where: { id: roundId },
      data: { status: RoundStatus.IN_PROGRESS, startedAt: new Date() },
      include: RoundInclude,
    });
  }

  async completeRound(roundId: string) {
    return this.prisma.carpoolRound.update({
      where: { id: roundId },
      data: { status: RoundStatus.COMPLETED, completedAt: new Date() },
      include: RoundInclude,
    });
  }

  async cancelRound(roundId: string) {
    return this.prisma.carpoolRound.update({
      where: { id: roundId },
      data: { status: RoundStatus.CANCELLED },
    });
  }

  async getRound(roundId: string) {
    return this.prisma.carpoolRound.findUnique({
      where: { id: roundId },
      include: RoundInclude,
    });
  }

  async getScheduledRounds(carpoolId: string) {
    return this.prisma.carpoolRound.findMany({
      where: { carpoolId, status: RoundStatus.SCHEDULED },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updatePickupChecklist(
    roundId: string,
    memberId: string,
    dto: UpdateChecklistBatchDto,
  ) {
    return this.prisma.$transaction(
      dto.map((item) =>
        this.prisma.carpoolRoundPickupChecklist.update({
          where: { roundId_childId: { roundId, childId: item.childId } },
          data: {
            status: item.status,
            note: item.note,
            checkedAt: new Date(),
            memberId,
          },
        }),
      ),
    );
  }

  async updateDropoffChecklist(
    roundId: string,
    memberId: string,
    dto: UpdateChecklistBatchDto,
  ) {
    return this.prisma.$transaction(
      dto.map((item) =>
        this.prisma.carpoolRoundDropoffChecklist.update({
          where: { roundId_childId: { roundId, childId: item.childId } },
          data: {
            status: item.status,
            note: item.note,
            checkedAt: new Date(),
            memberId,
          },
        }),
      ),
    );
  }

  async updateVehicleLocationInDb(
    carpoolId: string,
    latitude: number,
    longitude: number,
  ) {
    return this.prisma.carpool.update({
      where: { id: carpoolId },
      data: {
        vehicleLocation: {
          upsert: {
            create: {
              latitude,
              longitude,
            },
            update: { latitude, longitude },
          },
        },
      },
    });
  }

  async getInProgressRound(carpoolId: string) {
    return this.prisma.carpoolRound.findFirst({
      where: { carpoolId, status: RoundStatus.IN_PROGRESS },
    });
  }
}
