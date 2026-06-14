import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { MAIL_JOBS, MAIL_QUEUE } from './mail.constants';
import { SendMailData } from './mail.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(@InjectQueue(MAIL_QUEUE) private readonly queue: Queue) {}

  async sendMail(
    data: SendMailData,
    options: JobsOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50, age: 24 * 60 * 60 },
    },
  ): Promise<void> {
    this.logger.debug(`Queuing mail to ${data.email}`);
    await this.queue.add(MAIL_JOBS.SEND, data, options);
  }
}
