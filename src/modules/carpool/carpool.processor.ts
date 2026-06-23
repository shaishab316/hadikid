import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { CARPOOL_QUEUE, CarpoolEvent, CarpoolJob } from './carpool.constant';
import { CarpoolRoundReminderEvent } from './carpool.interface';

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

  // CarpoolRepository removed — rounds are now created directly in
  // CarpoolService.scheduleNextRound(), not via a BullMQ job.
  constructor(private readonly eventEmitter: EventEmitter2) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async process(job: Job) {
    switch (job.name) {
      case CarpoolJob.NOTIFY_BEFORE_30:
      case CarpoolJob.NOTIFY_BEFORE_15:
        return this.handleRoundReminder(job.data as RoundReminderJobData);

      default:
        this.logger.warn(`Unknown carpool job: ${job.name}`);
    }
  }

  private handleRoundReminder(data: RoundReminderJobData) {
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

    // Emit ROUND_REMINDER — not ROUND_STARTED — so the correct
    // onRoundReminder handler fires in the notification listener.
    this.eventEmitter.emit(CarpoolEvent.ROUND_REMINDER, payload);
  }
}
