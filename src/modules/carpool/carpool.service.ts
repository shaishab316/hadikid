import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '@/infra/redis/redis.service';
import { CarpoolRepository } from './repositories/carpool.repository';
import {
  CarpoolEvent,
  CarpoolRole,
  RoundStatus,
  RoundType,
  VEHICLE_LOCATION_DB_FLUSH_INTERVAL,
} from './carpool.constant';
import { CreateCarpoolDto } from './dto/create-carpool.dto';
import { UpdateCarpoolDto } from './dto/update-carpool.dto';
import { InviteMemberDto } from './dto/invite-carpool.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateChecklistBatchDto } from './dto/checklist-update.dto';
import { UpdateVehicleLocationDto } from './dto/update-vehicle-location.dto';
import { QueryDefaultDto } from '@/common/dto/sharedDtoSchema';
import { NotificationService } from '@/infra/notification/notification.service';
import { NotificationType } from '@/infra/notification/notification.constants';

@Injectable()
export class CarpoolService {
  private readonly logger = new Logger(CarpoolService.name);

  // Tracks how many location updates have been received per carpool since last DB flush
  private readonly vehicleLocationUpdateCount = new Map<string, number>();

  constructor(
    private readonly carpoolRepository: CarpoolRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly redis: RedisService,
    private readonly notificationService: NotificationService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // CARPOOL CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  async createCarpool(userId: number, dto: CreateCarpoolDto) {
    const belong = await this.carpoolRepository.verifyChildrenBelongToUser(
      userId,
      dto.selectedChildrenIds,
    );
    if (!belong) {
      throw new BadRequestException('Some children do not belong to you');
    }

    const carpool = await this.carpoolRepository.createCarpool(userId, dto);

    // Emit CREATED first so the chat listener can create the conversation
    this.eventEmitter.emit(CarpoolEvent.CREATED, {
      carpoolId: carpool.id,
      title: carpool.title,
      ownerId: userId,
      memberIds: [userId],
    });

    // Schedule the first PICKUP round using the carpool's start date
    await this.scheduleNextRound(carpool.id, dto.date, RoundType.PICKUP);

    // Send invitations to any pre-specified members
    if (dto.memberIds && dto.memberIds.length > 0) {
      for (const memberId of dto.memberIds) {
        if (memberId === userId) continue;
        try {
          await this.inviteMember(userId, carpool.id, {
            userId: memberId,
            message: 'You have been invited to join this carpool.',
          });
        } catch (error) {
          this.logger.warn(
            `Failed to invite user ${memberId} on carpool creation: ${error.message}`,
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
        if (memberId === userId) continue;
        try {
          await this.inviteMember(userId, carpool.id, {
            userId: memberId,
            message: 'You have been invited to join this carpool.',
          });
        } catch (error) {
          this.logger.warn(
            `Failed to invite user ${memberId} on carpool update: ${error.message}`,
          );
        }
      }
    }

    return carpool;
  }

  async deleteCarpool(userId: number, carpoolId: string) {
    await this.assertOwner(carpoolId, userId);

    const memberIds = await this.carpoolRepository.getMemberUserIds(carpoolId);
    const carpool = await this.carpoolRepository.getCarpoolById(carpoolId);

    // Cancel all non-terminal rounds (SCHEDULED and IN_PROGRESS) and their jobs
    const activeRounds =
      await this.carpoolRepository.getActiveRounds(carpoolId);
    for (const round of activeRounds) {
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

  // ─────────────────────────────────────────────────────────────────────────────
  // DRIVER
  // ─────────────────────────────────────────────────────────────────────────────

  async assignDriver(userId: number, carpoolId: string) {
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

    // FIX: also clear driverId from all future SCHEDULED rounds
    await this.carpoolRepository.resignDriver(carpoolId);

    const memberIds = await this.carpoolRepository.getMemberUserIds(carpoolId);

    this.eventEmitter.emit(CarpoolEvent.DRIVER_RESIGNED, {
      carpoolId,
      title: carpool.title,
      formerDriverId: userId,
      memberIds,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INVITES / MEMBERSHIP
  // ─────────────────────────────────────────────────────────────────────────────

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

  async acceptInvite(userId: number, carpoolId: string, dto: AcceptInviteDto) {
    const belong = await this.carpoolRepository.verifyChildrenBelongToUser(
      userId,
      dto.selectedChildrenIds,
    );
    if (!belong) {
      throw new BadRequestException('Some children do not belong to you');
    }

    const alreadyMember = await this.carpoolRepository.isMember(
      carpoolId,
      userId,
    );
    if (alreadyMember) {
      throw new BadRequestException('User is already a member of this carpool');
    }

    const carpool = await this.getOrThrow(carpoolId);
    const member = await this.carpoolRepository.acceptInvite(
      carpoolId,
      userId,
      dto.selectedChildrenIds,
    );
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
    const ownerId = await this.carpoolRepository.getOwnerId(carpoolId);

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

  // ─────────────────────────────────────────────────────────────────────────────
  // ROUNDS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Driver can start a round at any time (even before its scheduledAt).
   * The round must be in SCHEDULED status — cannot restart a COMPLETED or
   * CANCELLED round, and an already IN_PROGRESS round is returned as-is
   * (idempotent).
   */
  async startRound(userId: number, roundId: string) {
    const round = await this.carpoolRepository.getRound(roundId);
    if (!round) throw new NotFoundException('Round not found');

    // FIX: use round.driverId (the round-level driver), falling back to carpool driver.
    // This supports the case where the round was assigned a different driver than the carpool default.
    const effectiveDriverId = round.driverId ?? round.carpool.driverId;
    if (effectiveDriverId !== userId) {
      throw new ForbiddenException(
        'Only the assigned driver can start this round',
      );
    }

    if (round.carpool.isDeleted) {
      throw new BadRequestException(
        'Cannot start a round for a deleted carpool',
      );
    }

    // Idempotent: already started
    if (round.status === RoundStatus.IN_PROGRESS) {
      return round;
    }

    // FIX: guard against starting a terminal round
    if (round.status !== RoundStatus.SCHEDULED) {
      throw new BadRequestException(
        `Round cannot be started: current status is "${round.status}"`,
      );
    }

    await this.cancelRoundJobs(roundId);
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

  /**
   * Completes a round that is IN_PROGRESS.
   *
   * Round lifecycle: PICKUP complete → schedule DROPOFF
   *                  DROPOFF complete → schedule next PICKUP (per repeat rule)
   */
  async completeRound(userId: number, roundId: string) {
    const round = await this.carpoolRepository.getRound(roundId);
    if (!round) throw new NotFoundException('Round not found');

    const effectiveDriverId = round.driverId ?? round.carpool.driverId;
    if (effectiveDriverId !== userId) {
      throw new ForbiddenException(
        'Only the assigned driver can complete this round',
      );
    }

    // Idempotent
    if (round.status === RoundStatus.COMPLETED) {
      return round;
    }

    if (round.status !== RoundStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Round cannot be completed: current status is "${round.status}"`,
      );
    }

    await this.cancelRoundJobs(roundId);
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

    // FIX: implement the PICKUP → DROPOFF → next PICKUP cycle correctly
    await this.scheduleFollowUpRound(
      round.carpoolId,
      round.scheduledAt,
      round.type as RoundType,
    );

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECKLIST
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // VEHICLE LOCATION
  // ─────────────────────────────────────────────────────────────────────────────

  async updateVehicleLocation(
    userId: number,
    carpoolId: string,
    dto: UpdateVehicleLocationDto,
  ) {
    const { latitude, longitude } = dto;

    // FIX: replace Math.random() with a deterministic counter-based flush strategy.
    // Emit the real-time socket event on every call, but only write to DB every
    // VEHICLE_LOCATION_DB_FLUSH_INTERVAL updates to reduce write pressure.
    const count = (this.vehicleLocationUpdateCount.get(carpoolId) ?? 0) + 1;
    this.vehicleLocationUpdateCount.set(carpoolId, count);

    if (count >= VEHICLE_LOCATION_DB_FLUSH_INTERVAL) {
      this.vehicleLocationUpdateCount.set(carpoolId, 0);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // ROUND SCHEDULING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Determines what to schedule after a round completes:
   *
   *   PICKUP completed  → schedule a DROPOFF for the same day (same scheduledAt date,
   *                        but using the repeat rule's dropoff time if it exists, otherwise
   *                        we keep the same time — callers can extend this later).
   *
   *   DROPOFF completed → calculate the next PICKUP occurrence per the repeat rule.
   *
   * This creates the full PICKUP ↔ DROPOFF cycle automatically.
   */
  private async scheduleFollowUpRound(
    carpoolId: string,
    lastScheduledAt: Date,
    lastType: RoundType,
  ) {
    if (lastType === RoundType.PICKUP) {
      // Schedule the DROPOFF for the same occurrence (same date, same time for now)
      await this.scheduleNextRound(
        carpoolId,
        lastScheduledAt,
        RoundType.DROPOFF,
      );
    } else {
      // DROPOFF completed → advance to next occurrence and schedule PICKUP
      const carpool = await this.carpoolRepository.getCarpool(carpoolId);
      if (!carpool?.repeatRule) {
        this.logger.warn(
          `No repeat rule for carpool ${carpoolId}; no next PICKUP will be scheduled`,
        );
        return;
      }

      const nextAt = this.calculateNextOccurrence(
        carpool.repeatRule,
        lastScheduledAt,
      );
      if (!nextAt) {
        this.logger.log(
          `No more occurrences for carpool ${carpoolId} (ONCE or past endDate)`,
        );
        return;
      }

      await this.scheduleNextRound(carpoolId, nextAt, RoundType.PICKUP);
    }
  }

  /**
   * Creates a SCHEDULED round in the DB immediately (visible to clients right
   * away) and queues BullMQ reminder notifications.
   *
   * If `scheduledAt` is in the past the method advances through the repeat rule
   * to find the next future occurrence.  Returns undefined when there is none
   * (ONCE / rule exhausted).
   */
  async scheduleNextRound(
    carpoolId: string,
    scheduledAt: Date,
    type: RoundType,
  ) {
    const carpool = await this.carpoolRepository.getCarpool(carpoolId);
    if (!carpool) {
      this.logger.warn(`Carpool ${carpoolId} not found; cannot schedule round`);
      return;
    }

    // Advance past any dates that are already in the past
    let nextAt: Date | null = new Date(scheduledAt);

    if (nextAt.getTime() <= Date.now()) {
      if (!carpool.repeatRule || carpool.repeatRule.frequency === 'ONCE') {
        this.logger.warn(
          `scheduledAt is in the past and carpool ${carpoolId} has no repeating rule; skipping`,
        );
        return;
      }

      this.logger.warn(
        `scheduledAt ${nextAt.toISOString()} is in the past for carpool ${carpoolId}; finding next future occurrence`,
      );

      while (nextAt !== null && nextAt.getTime() <= Date.now()) {
        nextAt = this.calculateNextOccurrence(carpool.repeatRule, nextAt);
      }

      if (!nextAt) {
        this.logger.warn(
          `No upcoming occurrence for carpool ${carpoolId} (rule exhausted)`,
        );
        return;
      }
    }

    // Prevent duplicate rounds for the same (carpool, type, scheduledAt)
    const existing = await this.carpoolRepository.findRoundByScheduledAt(
      carpoolId,
      type,
      nextAt,
    );
    if (existing) {
      this.logger.log(
        `Round already exists for carpool ${carpoolId} [${type}] at ${nextAt.toISOString()} (id: ${existing.id})`,
      );
      return existing;
    }

    const round = await this.carpoolRepository.createRound(
      carpoolId,
      nextAt,
      type,
    );

    this.logger.log(
      `Round ${round.id} [${type}] created for carpool ${carpoolId} at ${nextAt.toISOString()}`,
    );

    const ownerId =
      carpool.members.find((m) => m.role === CarpoolRole.OWNER)?.userId ??
      carpool.driverId ??
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

    return round;
  }

  /**
   * Returns the next Date after `currentDate` that satisfies the repeat rule,
   * with the rule's `timeOfDay` (HH:MM UTC) applied.
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
    if (repeatRule.frequency === 'ONCE') return null;

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

    // Apply timeOfDay from the repeat rule (HH:MM UTC)
    if (repeatRule.timeOfDay) {
      const [hh, mm] = repeatRule.timeOfDay.split(':').map(Number);
      nextDate.setUTCHours(hh ?? 0, mm ?? 0, 0, 0);
    } else {
      // Preserve original time if no timeOfDay is configured
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

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private async cancelRoundJobs(roundId: string) {
    await this.notificationService.cancelNotification(`reminder30-${roundId}`);
    await this.notificationService.cancelNotification(`reminder15-${roundId}`);
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

  private async getMemberId(roundId: string, userId: number): Promise<string> {
    const round = await this.carpoolRepository.getRound(roundId);
    if (!round) throw new NotFoundException('Round not found');

    const member = round.carpool.members.find((m: any) => m.userId === userId);
    if (!member) {
      throw new ForbiddenException('You are not a member of this carpool');
    }

    return member.id;
  }
}
