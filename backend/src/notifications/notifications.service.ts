import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@InjectQueue('notifications') private notificationQueue: Queue) {}

  async sendLineNotification(userId: string, message: string) {
    this.logger.log(`Queueing LINE notification for user ${userId}`);
    await this.notificationQueue.add('line-message', {
      userId,
      message,
    });
  }
}
