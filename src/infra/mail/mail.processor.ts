import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Job } from 'bullmq';
import { MAIL_QUEUE } from './mail.constants';
import { SendMailData } from './mail.interface';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private logger = new Logger(MailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job<SendMailData>) {
    this.logger.debug(`Processing mail job: ${job.id}`);

    try {
      await this.mailer.sendMail({
        to: job.data.email,
        subject: job.data.subject,
        html: job.data.body,
      });

      this.logger.log(`Mail sent successfully to ${job.data.email}`);
    } catch (error) {
      this.logger.debug(`Failed to send mail to ${job.data.email}: ${error}`);
      throw error;
    }
  }
}
