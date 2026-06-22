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
  VEHICLE_LOCATION_DB_FLUSH_INTERVAL,
} from './carpool.constant';
import { CreateCarpoolDto } from './dto/create-carpool.dto';
import { UpdateCarpoolDto } from './dto/update-carpool.dto';
import { InviteMemberDto } from './dto/invite-carpool.dto';
import {
  UpdateChecklistDto,
  UpdateChecklistBatchDto,
} from './dto/checklist-update.dto';
import { UpdateVehicleLocationDto } from './dto/update-vehicle-location.dto';
import { CACHE_KEY } from '@/infra/redis/redis.constant';
import { QueryDefaultDto } from '@/common/dto/sharedDtoSchema';
import { NotificationService } from '@/infra/notification/notification.service';
import { NotificationType } from '@/infra/notification/notification.constants';

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
        this.logger.warn(`Failed to send warning notification: ${error.message}`);
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
    await this.getMemberId(roundId, userId);
    return this.carpoolRepository.updatePickupChecklist(
      roundId,
      dto as unknown as UpdateChecklistDto[],
    );
  }

  async updateDropoffChecklist(
    userId: number,
    roundId: string,
    dto: UpdateChecklistBatchDto,
  ) {
    await this.getMemberId(roundId, userId);
    return this.carpoolRepository.updateDropoffChecklist(
      roundId,
      dto as unknown as UpdateChecklistDto[],
    );
  }

  async updateVehicleLocation(userId: number, dto: UpdateVehicleLocationDto) {
    const { carpoolId, roundId, latitude, longitude } = dto;
    const key = CACHE_KEY.CARPOOL.VEHICLE_LOCATION(carpoolId);

    const updateCount = await this.redis.getClient().incr(`${key}:count`);

    await this.redis
      .getClient()
      .set(
        key,
        JSON.stringify({ latitude, longitude, updatedAt: Date.now() }),
        'EX',
        60 * 10,
      );

    if (updateCount % VEHICLE_LOCATION_DB_FLUSH_INTERVAL === 0) {
      await this.carpoolRepository.updateVehicleLocationInDb(
        carpoolId,
        latitude,
        longitude,
      );
    }

    this.eventEmitter.emit(CarpoolEvent.VEHICLE_LOCATION_UPDATED, {
      carpoolId,
      roundId,
      driverId: userId,
      latitude,
      longitude,
      updateCount,
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

  async scheduleNextRound(
    carpoolId: string,
    scheduledAt: Date,
    type: RoundType,
  ) {
    const delay = scheduledAt.getTime() - Date.now();
    if (delay < 0) {
      this.logger.warn(`Skipping past round for carpool ${carpoolId}`);
      return;
    }

    const timeStr = scheduledAt.toISOString().replace(/:/g, '-');

    const roundJob = await this.carpoolQueue.add(
      CarpoolJob.SCHEDULE_ROUND,
      { carpoolId, scheduledAt: scheduledAt.toISOString(), type },
      { delay, jobId: `round-${carpoolId}-${timeStr}` },
    );

    const delay30 = delay - 30 * 60 * 1000;
    if (delay30 > 0) {
      await this.carpoolQueue.add(
        CarpoolJob.NOTIFY_BEFORE_30,
        {
          carpoolId,
          roundId: '',
          carpoolTitle: '',
          scheduledAt: scheduledAt.toISOString(),
          minutesBefore: 30,
          memberIds: [],
        },
        {
          delay: delay30,
          jobId: `reminder30-${carpoolId}-${timeStr}`,
        },
      );
    }

    const delay15 = delay - 15 * 60 * 1000;
    if (delay15 > 0) {
      await this.carpoolQueue.add(
        CarpoolJob.NOTIFY_BEFORE_15,
        {
          carpoolId,
          roundId: '',
          carpoolTitle: '',
          scheduledAt: scheduledAt.toISOString(),
          minutesBefore: 15,
          memberIds: [],
        },
        {
          delay: delay15,
          jobId: `reminder15-${carpoolId}-${timeStr}`,
        },
      );
    }

    this.logger.log(
      `Scheduled round job ${roundJob.id} for carpool ${carpoolId} at ${scheduledAt.toISOString()}`,
    );
  }

  private async scheduleNextRoundAfter(
    carpoolId: string,
    lastScheduledAt: Date,
    lastType: RoundType,
  ) {
    const nextAt = new Date(lastScheduledAt);
    nextAt.setDate(nextAt.getDate() + 1);

    await this.scheduleNextRound(carpoolId, nextAt, lastType);
  }

  private async cancelRoundJobs(roundId: string) {
    const job30 = await this.carpoolQueue.getJob(`reminder30-${roundId}`);
    const job15 = await this.carpoolQueue.getJob(`reminder15-${roundId}`);
    await job30?.remove();
    await job15?.remove();
  }
}
