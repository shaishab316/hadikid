import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RedisService } from '@/infra/redis/redis.service';
import { CarpoolRepository } from './repositories/carpool.repository';
import {
  CARPOOL_QUEUE,
  CarpoolEvent,
  CarpoolJob,
  CarpoolRole,
  RoundStatus,
  RoundType,
} from './carpool.constant';
import { CreateCarpoolDto } from './dto/create-carpool.dto';
import { UpdateCarpoolDto } from './dto/update-carpool.dto';
import { InviteMemberDto } from './dto/invite-carpool.dto';
import { UpdateChecklistBatchDto } from './dto/checklist-update.dto';
import { UpdateVehicleLocationDto } from './dto/update-vehicle-location.dto';
import { QueryDefaultDto } from '@/common/dto/sharedDtoSchema';
import { NotificationService } from '@/infra/notification/notification.service';
import { NotificationType } from '@/infra/notification/notification.constants';
import { CarpoolVehicleLocationUpdatedEvent } from './carpool.interface';

@Injectable()
export class CarpoolService {
  private readonly logger = new Logger(CarpoolService.name);

  constructor(
    private readonly carpoolRepository: CarpoolRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly redis: RedisService,
    @InjectQueue(CARPOOL_QUEUE) private readonly carpoolQueue: Queue,
    private readonly notificationService: NotificationService,
  ) {}

  async createCarpool(userId: number, dto: CreateCarpoolDto) {
    const belong = await this.carpoolRepository.verifyChildrenBelongToUser(
      userId,
      dto.selectedChildrenIds,
    );
    if (!belong) {
      throw new BadRequestException('Some children do not belong to you');
    }

    const carpool = await this.carpoolRepository.createCarpool(userId, dto);

    this.eventEmitter.emit(CarpoolEvent.CREATED, {
      carpoolId: carpool.id,
      title: carpool.title,
      ownerId: userId,
      memberIds: [userId],
    });

    await this.scheduleNextRound(carpool.id, dto.date, RoundType.PICKUP);

    if (dto.memberIds && dto.memberIds.length > 0) {
      for (const memberId of dto.memberIds) {
        if (memberId === userId) {
          continue;
        }

        try {
          await this.inviteMember(userId, carpool.id, {
            userId: memberId,
            message: 'You have been invited to join this carpool.',
          });
        } catch (error) {
          this.logger.warn(
            `Failed to send default invitation to user ${memberId} on carpool creation: ${error.message}`,
          );
        }
      }
    }

    return carpool;
  }

  async updateCarpool(
    userId: number,
    carpoolId: string,
    dto: UpdateCarpoolDto,
  ) {
    await this.assertOwner(carpoolId, userId);
    await this.assertNotInProgress(carpoolId);

    const carpool = await this.carpoolRepository.updateCarpool(carpoolId, dto);
    const memberIds = await this.carpoolRepository.getMemberUserIds(carpoolId);
    const changedFields = Object.keys(dto).filter((k) => dto[k] !== undefined);

    this.eventEmitter.emit(CarpoolEvent.UPDATED, {
      carpoolId,
      title: carpool.title,
      updatedById: userId,
      memberIds,
      changedFields,
    });

    if (dto.memberIds && dto.memberIds.length > 0) {
      for (const memberId of dto.memberIds) {
        if (memberId === userId) {
          continue;
        }

        try {
          await this.inviteMember(userId, carpool.id, {
            userId: memberId,
            message: 'You have been invited to join this carpool.',
          });
        } catch (error) {
          this.logger.warn(
            `Failed to send default invitation to user ${memberId} on carpool creation: ${error.message}`,
          );
        }
      }
    }

    return carpool;
  }

  async deleteCarpool(userId: number, carpoolId: string) {
    await this.assertOwner(carpoolId, userId);
    await this.assertNotInProgress(carpoolId);

    const memberIds = await this.carpoolRepository.getMemberUserIds(carpoolId);
    const carpool = await this.carpoolRepository.getCarpoolById(carpoolId);

    const scheduledRounds =
      await this.carpoolRepository.getScheduledRounds(carpoolId);
    for (const round of scheduledRounds) {
      await this.cancelRoundJobs(round.id);
      await this.carpoolRepository.cancelRound(round.id);
    }

    await this.carpoolRepository.softDeleteCarpool(carpoolId);

    this.eventEmitter.emit(CarpoolEvent.DELETED, {
      carpoolId,
      title: carpool?.title ?? 'Unknown carpool',
      deletedById: userId,
      memberIds,
    });
  }

  async assignDriver(userId: number, carpoolId: string) {
    await this.assertOwner(carpoolId, userId);

    const isMember = await this.carpoolRepository.isMember(carpoolId, userId);
    if (!isMember) {
      throw new BadRequestException('Driver must be a carpool member');
    }

    const carpool = await this.carpoolRepository.assignDriver(
      carpoolId,
      userId,
    );
    const memberIds = await this.carpoolRepository.getMemberUserIds(carpoolId);

    this.eventEmitter.emit(CarpoolEvent.DRIVER_ASSIGNED, {
      carpoolId,
      title: carpool.title,
      driverId: userId,
      assignedById: userId,
      memberIds,
    });

    return carpool;
  }

  async resignAsDriver(userId: number, carpoolId: string) {
    const carpool = await this.getOrThrow(carpoolId);
    if (carpool.driverId !== userId) {
      throw new ForbiddenException('You are not the driver of this carpool');
    }

    const memberIds = await this.carpoolRepository.getMemberUserIds(carpoolId);
    await this.carpoolRepository.resignDriver(carpoolId);

    this.eventEmitter.emit(CarpoolEvent.DRIVER_RESIGNED, {
      carpoolId,
      title: carpool.title,
      formerDriverId: userId,
      memberIds,
    });
  }

  async inviteMember(userId: number, carpoolId: string, dto: InviteMemberDto) {
    await this.assertOwner(carpoolId, userId);

    const isContact = await this.carpoolRepository.isContact(
      userId,
      dto.userId,
    );
    if (!isContact) {
      try {
        await this.notificationService.sendNotification({
          userIds: [userId],
          title: 'Invitation Failed',
          message: 'You can only invite your contacts',
          type: NotificationType.WARNING,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send warning notification: ${error.message}`,
        );
      }

      throw new BadRequestException('You can only invite your contacts');
    }

    const alreadyMember = await this.carpoolRepository.isMember(
      carpoolId,
      dto.userId,
    );
    if (alreadyMember) {
      throw new BadRequestException('User is already a member');
    }

    const carpool = await this.getOrThrow(carpoolId);
    await this.carpoolRepository.createInvite(carpoolId, userId, dto);

    this.eventEmitter.emit(CarpoolEvent.MEMBER_INVITED, {
      carpoolId,
      title: carpool.title,
      invitedUserId: dto.userId,
      invitedByUserId: userId,
      message: dto.message,
    });
  }

  async withdrawInvite(
    userId: number,
    carpoolId: string,
    invitedUserId: number,
  ) {
    await this.assertOwner(carpoolId, userId);
    const carpool = await this.getOrThrow(carpoolId);

    await this.carpoolRepository.withdrawInvite(carpoolId, invitedUserId);

    this.eventEmitter.emit(CarpoolEvent.INVITE_WITHDRAWN, {
      carpoolId,
      title: carpool.title,
      invitedUserId,
      withdrawnByUserId: userId,
    });
  }

  async acceptInvite(userId: number, carpoolId: string) {
    const carpool = await this.getOrThrow(carpoolId);
    const member = await this.carpoolRepository.acceptInvite(carpoolId, userId);
    const memberIds = await this.carpoolRepository.getMemberUserIds(carpoolId);
    const conversationId =
      await this.carpoolRepository.getCarpoolConversationId(carpoolId);

    this.eventEmitter.emit(CarpoolEvent.INVITE_ACCEPTED, {
      carpoolId,
      title: carpool.title,
      userId,
      memberIds,
      conversationId,
    });

    return member;
  }

  async declineInvite(userId: number, carpoolId: string) {
    const carpool = await this.getOrThrow(carpoolId);
    const ownerId = await this.getOwnerId(carpoolId);

    await this.carpoolRepository.declineInvite(carpoolId, userId);

    this.eventEmitter.emit(CarpoolEvent.INVITE_DECLINED, {
      carpoolId,
      title: carpool.title,
      userId,
      ownerId,
    });
  }

  async leaveCarpool(userId: number, carpoolId: string) {
    const member = await this.carpoolRepository.isMember(carpoolId, userId);
    if (!member) {
      throw new NotFoundException('You are not a member of this carpool');
    }
    if (member.role === CarpoolRole.OWNER) {
      throw new BadRequestException(
        'Owner cannot leave. Transfer ownership or delete the carpool.',
      );
    }

    const carpool = await this.getOrThrow(carpoolId);
    const conversationId =
      await this.carpoolRepository.getCarpoolConversationId(carpoolId);

    await this.carpoolRepository.memberLeave(carpoolId, userId);
    const memberIds = await this.carpoolRepository.getMemberUserIds(carpoolId);

    this.eventEmitter.emit(CarpoolEvent.MEMBER_LEFT, {
      carpoolId,
      title: carpool.title,
      userId,
      memberIds,
      conversationId,
    });
  }

  async startRound(userId: number, roundId: string) {
    const round = await this.carpoolRepository.getRound(roundId);
    if (!round) throw new NotFoundException('Round not found');
    if (round.carpool.driverId !== userId) {
      throw new ForbiddenException('Only the driver can start a round');
    }
    if (round.status !== RoundStatus.SCHEDULED) {
      throw new BadRequestException(`Round is already ${round.status}`);
    }

    const updated = await this.carpoolRepository.startRound(roundId);
    const memberIds = await this.carpoolRepository.getMemberUserIds(
      round.carpoolId,
    );

    this.eventEmitter.emit(CarpoolEvent.ROUND_STARTED, {
      carpoolId: round.carpoolId,
      roundId,
      carpoolTitle: round.carpool.title,
      type: round.type,
      driverId: userId,
      memberIds,
    });

    return updated;
  }

  async completeRound(userId: number, roundId: string) {
    const round = await this.carpoolRepository.getRound(roundId);
    if (!round) throw new NotFoundException('Round not found');
    if (round.carpool.driverId !== userId) {
      throw new ForbiddenException('Only the driver can complete a round');
    }
    if (round.status !== RoundStatus.IN_PROGRESS) {
      throw new BadRequestException('Round is not in progress');
    }

    const updated = await this.carpoolRepository.completeRound(roundId);
    const memberIds = await this.carpoolRepository.getMemberUserIds(
      round.carpoolId,
    );

    this.eventEmitter.emit(CarpoolEvent.ROUND_COMPLETED, {
      carpoolId: round.carpoolId,
      roundId,
      carpoolTitle: round.carpool.title,
      type: round.type,
      driverId: userId,
      memberIds,
    });

    await this.scheduleNextRoundAfter(
      round.carpoolId,
      round.scheduledAt,
      round.type as RoundType,
    );

    return updated;
  }

  async updatePickupChecklist(
    userId: number,
    roundId: string,
    dto: UpdateChecklistBatchDto,
  ) {
    const memberId = await this.getMemberId(roundId, userId);
    return this.carpoolRepository.updatePickupChecklist(roundId, memberId, dto);
  }

  async updateDropoffChecklist(
    userId: number,
    roundId: string,
    dto: UpdateChecklistBatchDto,
  ) {
    const memberId = await this.getMemberId(roundId, userId);
    return this.carpoolRepository.updateDropoffChecklist(
      roundId,
      memberId,
      dto,
    );
  }

  async updateVehicleLocation(
    userId: number,
    carpoolId: string,
    dto: UpdateVehicleLocationDto,
  ) {
    const { latitude, longitude } = dto;

    const shouldUpdateDb = Math.floor(Math.random() * 10) === 5;
    if (shouldUpdateDb) {
      await this.carpoolRepository.updateVehicleLocationInDb(
        carpoolId,
        latitude,
        longitude,
      );
    }

    this.eventEmitter.emit(CarpoolEvent.VEHICLE_LOCATION_UPDATED, {
      carpoolId,
      latitude,
      longitude,
    });
  }

  async getMyCarpools(userId: number, query: QueryDefaultDto) {
    return await this.carpoolRepository.getMyCarpools(userId, query);
  }

  async getCarpoolDetails(userId: number, carpoolId: string) {
    const isMember = await this.carpoolRepository.isMember(carpoolId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this carpool');
    }

    const carpool = await this.carpoolRepository.getCarpool(carpoolId);
    if (!carpool) {
      throw new NotFoundException('Carpool not found');
    }

    return carpool;
  }

  async getIncomingInvites(userId: number, query: QueryDefaultDto) {
    return await this.carpoolRepository.getIncomingInvites(userId, query);
  }

  async getOutgoingInvites(userId: number, query: QueryDefaultDto) {
    return await this.carpoolRepository.getOutgoingInvites(userId, query);
  }

  private async getOrThrow(carpoolId: string) {
    const carpool = await this.carpoolRepository.getCarpool(carpoolId);
    if (!carpool) throw new NotFoundException('Carpool not found');
    return carpool;
  }

  private async assertOwner(carpoolId: string, userId: number) {
    const member = await this.carpoolRepository.isMember(carpoolId, userId);
    if (!member || member.role !== CarpoolRole.OWNER) {
      throw new ForbiddenException(
        'Only the carpool owner can perform this action',
      );
    }
    return member;
  }

  private async assertNotInProgress(carpoolId: string) {
    const carpool = await this.getOrThrow(carpoolId);
    const activeRound =
      await this.carpoolRepository.getInProgressRound(carpoolId);
    if (activeRound) {
      throw new BadRequestException(
        'Cannot modify carpool while a round is in progress',
      );
    }
    return carpool;
  }

  private async getOwnerId(carpoolId: string): Promise<number> {
    await this.carpoolRepository.isMember(carpoolId, 0);
    const carpool = await this.carpoolRepository.getCarpool(carpoolId);
    const ownerMember = (carpool as any).members?.find(
      (m: any) => m.role === CarpoolRole.OWNER,
    );
    return ownerMember?.userId ?? 0;
  }

  private async getMemberId(roundId: string, userId: number): Promise<string> {
    const round = await this.carpoolRepository.getRound(roundId);
    if (!round) throw new NotFoundException('Round not found');

    const member = round.carpool.members.find((m: any) => m.userId === userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this carpool');
    }

    return member.id;
  }

  /**
   * Creates a SCHEDULED round in the DB immediately (so the client can see
   * the upcoming round right away), then queues BullMQ reminder jobs.
   *
   * If `scheduledAt` is in the past we advance through the repeat rule until
   * we find the next future occurrence.  If there is none (ONCE / rule ended)
   * we log and return without creating anything.
   */
  async scheduleNextRound(
    carpoolId: string,
    scheduledAt: Date,
    type: RoundType,
  ) {
    const carpool = await this.carpoolRepository.getCarpool(carpoolId);
    if (!carpool) {
      this.logger.warn(`Carpool not found for carpool ${carpoolId}`);
      return;
    }

    // ── Advance past dates ────────────────────────────────────────────────
    let nextAt: Date | null = new Date(scheduledAt);

    if (nextAt.getTime() <= Date.now()) {
      this.logger.warn(
        `scheduledAt ${nextAt.toISOString()} is in the past for carpool ${carpoolId}, finding next future occurrence`,
      );

      if (!carpool.repeatRule) {
        this.logger.warn(
          `No repeat rule found for carpool ${carpoolId}, cannot advance past date`,
        );
        return;
      }

      while (nextAt && nextAt.getTime() <= Date.now()) {
        nextAt = this.calculateNextOccurrence(carpool.repeatRule, nextAt);
      }

      if (!nextAt) {
        this.logger.warn(
          `No upcoming occurrence for carpool ${carpoolId} (ONCE or rule ended)`,
        );
        return;
      }
    }

    // ── Create the round in DB immediately ───────────────────────────────
    const round = await this.carpoolRepository.createRound(
      carpoolId,
      nextAt,
      type,
    );

    this.logger.log(
      `Round ${round.id} (${type}) created for carpool ${carpoolId} at ${nextAt.toISOString()}`,
    );

    const ownerId =
      carpool.members.find((m) => m.role === CarpoolRole.OWNER)?.userId ||
      carpool.driverId ||
      0;

    this.eventEmitter.emit(CarpoolEvent.ROUND_CREATED, {
      carpoolId,
      roundId: round.id,
      carpoolTitle: carpool.title ?? '',
      type,
      scheduledAt: nextAt,
      memberIds: carpool.members.map((m) => m.userId),
      driverId: round.driverId ?? undefined,
      ownerId,
    });

    // ── Queue reminder notifications ──────────────────────────────────────
    const memberIds = carpool.members.map((m) => m.userId);
    const delay = nextAt.getTime() - Date.now();

    const delay30 = delay - 30 * 60 * 1000;
    if (delay30 > 0) {
      await this.carpoolQueue.add(
        CarpoolJob.NOTIFY_BEFORE_30,
        {
          carpoolId,
          roundId: round.id,
          carpoolTitle: carpool.title ?? '',
          scheduledAt: nextAt.toISOString(),
          minutesBefore: 30,
          memberIds,
        },
        {
          delay: delay30,
          jobId: `reminder30-${round.id}`,
          removeOnComplete: true,
        },
      );
    }

    const delay15 = delay - 15 * 60 * 1000;
    if (delay15 > 0) {
      await this.carpoolQueue.add(
        CarpoolJob.NOTIFY_BEFORE_15,
        {
          carpoolId,
          roundId: round.id,
          carpoolTitle: carpool.title ?? '',
          scheduledAt: nextAt.toISOString(),
          minutesBefore: 15,
          memberIds,
        },
        {
          delay: delay15,
          jobId: `reminder15-${round.id}`,
          removeOnComplete: true,
        },
      );
    }

    return round;
  }

  /**
   * Called after a round completes.  Calculates the next occurrence from the
   * completed round's scheduledAt and creates a new SCHEDULED round in DB.
   */
  private async scheduleNextRoundAfter(
    carpoolId: string,
    lastScheduledAt: Date,
    lastType: RoundType,
  ) {
    const carpool = await this.carpoolRepository.getCarpool(carpoolId);
    if (!carpool || !carpool.repeatRule) {
      this.logger.warn(
        `Could not schedule next round after for carpool ${carpoolId}: rule not found`,
      );
      return;
    }

    const nextAt = this.calculateNextOccurrence(
      carpool.repeatRule,
      lastScheduledAt,
    );

    if (!nextAt) {
      this.logger.log(
        `No more rounds to schedule for carpool ${carpoolId} (end of recurrence or ONCE)`,
      );
      return;
    }

    await this.scheduleNextRound(carpoolId, nextAt, lastType);
  }

  /**
   * Returns the next Date after `currentDate` that satisfies the repeat rule,
   * with the rule's `timeOfDay` (HH:MM UTC) applied to it.
   * Returns null when the rule is exhausted (ONCE or past endDate).
   */
  private calculateNextOccurrence(
    repeatRule: {
      frequency: string;
      byDay?: string | null;
      timeOfDay?: string | null;
      endDate?: Date | null;
    },
    currentDate: Date,
  ): Date | null {
    if (repeatRule.frequency === 'ONCE') {
      return null;
    }

    // Work on a date-only copy (strip time so day arithmetic is clean)
    const nextDate = new Date(currentDate);

    if (repeatRule.frequency === 'DAILY') {
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    } else if (repeatRule.frequency === 'CUSTOM') {
      if (!repeatRule.byDay) {
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      } else {
        const dayMap: Record<string, number> = {
          SU: 0,
          MO: 1,
          TU: 2,
          WE: 3,
          TH: 4,
          FR: 5,
          SA: 6,
        };
        const allowedDays = repeatRule.byDay
          .split(',')
          .map((d) => dayMap[d.trim()])
          .filter((d) => d !== undefined);

        if (allowedDays.length === 0) {
          nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        } else {
          do {
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);
          } while (!allowedDays.includes(nextDate.getUTCDay()));
        }
      }
    } else {
      // Fallback: treat unknown frequencies as daily
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }

    // ── Apply timeOfDay from the repeat rule (HH:MM UTC) ─────────────────
    if (repeatRule.timeOfDay) {
      const [hh, mm] = repeatRule.timeOfDay.split(':').map(Number);
      nextDate.setUTCHours(hh ?? 0, mm ?? 0, 0, 0);
    } else {
      // Preserve the original time from currentDate if no timeOfDay set
      nextDate.setUTCHours(
        currentDate.getUTCHours(),
        currentDate.getUTCMinutes(),
        0,
        0,
      );
    }

    if (
      repeatRule.endDate &&
      nextDate.getTime() > new Date(repeatRule.endDate).getTime()
    ) {
      return null;
    }

    return nextDate;
  }

  private async cancelRoundJobs(roundId: string) {
    const job30 = await this.carpoolQueue.getJob(`reminder30-${roundId}`);
    const job15 = await this.carpoolQueue.getJob(`reminder15-${roundId}`);
    await job30?.remove();
    await job15?.remove();
  }
}
