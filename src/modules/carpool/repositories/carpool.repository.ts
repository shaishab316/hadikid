import { PrismaService } from '@/infra/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { resolveLocation } from '@/modules/address/address.constant';
import {
  CarpoolInclude,
  CarpoolSelectForInvited,
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
import { UpdateChecklistDto } from '../dto/checklist-update.dto';
import { QueryDefaultDto } from '@/common/dto/sharedDtoSchema';
import { Prisma } from '@prisma/client';
import { ConversationMessageType } from '@/modules/conversation/conversation.constant';
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
    const { pickupAddress, dropoffAddress, ...rest } = dto;

    return this.prisma.carpool.update({
      where: { id: carpoolId },
      data: {
        ...rest,
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
    return this.prisma.carpool.update({
      where: { id: carpoolId },
      data: { driverId: userId },
      include: CarpoolInclude,
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
    return this.prisma.carpoolInvite.update({
      where: { carpoolId_userId: { carpoolId, userId: invitedUserId } },
      data: { status: CarpoolInviteStatus.CANCELLED },
    });
  }

  async acceptInvite(carpoolId: string, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.carpoolInvite.update({
        where: { carpoolId_userId: { carpoolId, userId } },
        data: { status: CarpoolInviteStatus.ACCEPTED },
      });

      const member = await tx.carpoolMember.create({
        data: { carpoolId, userId, role: CarpoolRole.MEMBER },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

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

        await tx.conversationMessage.create({
          data: {
            conversationId: carpool.conversationId,
            senderId: userId,
            type: ConversationMessageType.SYSTEM,
            content: `'${member.user.name}' joined this conversation.`,
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
    return this.prisma.carpoolMember.update({
      where: { carpoolId_userId: { carpoolId, userId } },
      data: { leftAt: new Date() },
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
    dto: UpdateChecklistDto,
  ) {
    return this.prisma.carpoolRoundPickupChecklist.update({
      where: { roundId_childId: { roundId, childId: dto.childId } },
      data: {
        status: dto.status,
        note: dto.note,
        checkedAt: new Date(),
        memberId,
      },
    });
  }

  async updateDropoffChecklist(
    roundId: string,
    memberId: string,
    dto: UpdateChecklistDto,
  ) {
    return this.prisma.carpoolRoundDropoffChecklist.update({
      where: { roundId_childId: { roundId, childId: dto.childId } },
      data: {
        status: dto.status,
        note: dto.note,
        checkedAt: new Date(),
        memberId,
      },
    });
  }

  async updateVehicleLocationInDb(
    carpoolId: string,
    latitude: number,
    longitude: number,
  ) {
    return this.prisma.carpool.update({
      where: { id: carpoolId },
      data: { vehicleLocation: { update: { latitude, longitude } } },
    });
  }

  async getInProgressRound(carpoolId: string) {
    return this.prisma.carpoolRound.findFirst({
      where: { carpoolId, status: RoundStatus.IN_PROGRESS },
    });
  }
}
