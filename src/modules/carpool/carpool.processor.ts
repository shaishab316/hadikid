import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { CARPOOL_QUEUE, CarpoolEvent, CarpoolJob } from './carpool.constant';
import { CarpoolRepository } from './repositories/carpool.repository';
import { CarpoolRoundReminderEvent } from './carpool.interface';

export interface ScheduleRoundJobData {
  carpoolId: string;
  scheduledAt: string; // ISO string
  type: 'PICKUP' | 'DROPOFF';
}

export interface RoundReminderJobData {
  carpoolId: string;
  roundId: string;
  carpoolTitle: string;
  scheduledAt: string;
  minutesBefore: 15 | 30;
  memberIds: number[];
}

@Processor(CARPOOL_QUEUE)
export class CarpoolProcessor extends WorkerHost {
  private readonly logger = new Logger(CarpoolProcessor.name);

  constructor(
    private readonly carpoolRepo: CarpoolRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case CarpoolJob.SCHEDULE_ROUND:
        return this.handleScheduleRound(job.data as ScheduleRoundJobData);

      case CarpoolJob.NOTIFY_BEFORE_30:
      case CarpoolJob.NOTIFY_BEFORE_15:
        return this.handleRoundReminder(job.data as RoundReminderJobData);

      default:
        this.logger.warn(`Unknown carpool job: ${job.name}`);
    }
  }

  // ─── Create the round in DB when its scheduled time arrives ───────────────
  // The driver will manually start it — this just materializes the round.

  private async handleScheduleRound(data: ScheduleRoundJobData) {
    this.logger.log(`Creating round for carpool ${data.carpoolId}`);

    const scheduledAt = new Date(data.scheduledAt);
    const round = await this.carpoolRepo.createRound(
      data.carpoolId,
      scheduledAt,
      data.type,
    );

    this.logger.log(`Round ${round.id} created for carpool ${data.carpoolId}`);
    return round;
  }

  // ─── Reminder notifications (30 min / 15 min before) ─────────────────────

  private async handleRoundReminder(data: RoundReminderJobData) {
    this.logger.log(
      `Sending ${data.minutesBefore}-min reminder for round ${data.roundId}`,
    );

    const payload: CarpoolRoundReminderEvent = {
      carpoolId: data.carpoolId,
      roundId: data.roundId,
      carpoolTitle: data.carpoolTitle,
      scheduledAt: new Date(data.scheduledAt),
      minutesBefore: data.minutesBefore,
      memberIds: data.memberIds,
    };

    this.eventEmitter.emit(CarpoolEvent.ROUND_STARTED, payload); // reuse listener for reminder notification
    // NOTE: listener checks minutesBefore to craft the right message
  }
}
