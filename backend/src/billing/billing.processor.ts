import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { SubscriptionsService } from './subscriptions.service';
import { SlipsService } from './slips.service';

export const BILLING_QUEUE = 'billing';

/**
 * Worker เก็บค่าบริการรายรอบ
 *
 * ตั้ง repeatable job ไว้ 2 ตัวตอนบูต:
 *   - collect-due    : ทุกวัน 02:00 น. ไล่เก็บเงิน subscription ที่ถึงกำหนด + retry ตามตาราง dunning
 *   - expiring-cards : ทุกวัน 09:00 น. แจ้งเตือนบัตรใกล้หมดอายุ
 *
 * ปลอดภัยเมื่อรันหลาย instance: BullMQ repeatable job จะถูกหยิบไปทำโดย worker ตัวเดียว
 * และการตัดเงินยังมี idempotency_key ระดับใบแจ้งหนี้กันซ้ำอีกชั้น
 */
@Injectable()
@Processor(BILLING_QUEUE)
export class BillingProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(BillingProcessor.name);

  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly slips: SlipsService,
    @InjectQueue(BILLING_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    // timezone ไทย — cron ของ BullMQ ใช้ tz ของ node ถ้าไม่ระบุ
    await this.queue.add(
      'collect-due',
      {},
      {
        repeat: { pattern: '0 2 * * *', tz: 'Asia/Bangkok' },
        jobId: 'billing-collect-due',
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );

    await this.queue.add(
      'expiring-cards',
      {},
      {
        repeat: { pattern: '0 9 * * *', tz: 'Asia/Bangkok' },
        jobId: 'billing-expiring-cards',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    // PromptPay ต่ออายุอัตโนมัติไม่ได้ → ต้องเตือนล่วงหน้าก่อนแพ็กเกจหมดอายุ
    await this.queue.add(
      'renewal-reminders',
      {},
      {
        repeat: { pattern: '30 9 * * *', tz: 'Asia/Bangkok' },
        jobId: 'billing-renewal-reminders',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log('ตั้งตารางเก็บค่าบริการอัตโนมัติแล้ว (ทุกวัน 02:00 น. เวลาไทย)');
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'collect-due': {
        this.logger.log('เริ่มรอบเก็บค่าบริการประจำวัน');
        return this.subscriptions.processDueSubscriptions();
      }
      case 'expiring-cards': {
        return { notified: await this.subscriptions.notifyExpiringCards() };
      }
      case 'renewal-reminders': {
        return { notified: await this.slips.sendRenewalReminders() };
      }
      default:
        this.logger.warn(`ไม่รู้จัก job: ${job.name}`);
        return null;
    }
  }
}
