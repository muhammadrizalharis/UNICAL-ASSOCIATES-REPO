import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue } from 'bullmq';

export const MAINTENANCE_QUEUE = 'unical-maintenance';
export const JOB_REFRESH_CITATIONS = 'refresh-citations';
export const JOB_TAKE_SNAPSHOT = 'take-snapshot';

function redisConnection() {
  return {
    host: process.env.REDIS_HOST ?? 'redis',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

/** Producer antrean: mendaftarkan jadwal berulang dan pemicu manual. */
@Injectable()
export class JobsQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsQueueService.name);
  private readonly queue = new Queue(MAINTENANCE_QUEUE, {
    connection: redisConnection(),
  });

  async onModuleInit(): Promise<void> {
    try {
      // Jadwal tersimpan di Redis; upsert aman dipanggil berulang.
      await this.queue.upsertJobScheduler(
        'daily-citation-refresh',
        { pattern: '0 2 * * *', tz: 'Asia/Makassar' },
        { name: JOB_REFRESH_CITATIONS },
      );
      await this.queue.upsertJobScheduler(
        'monthly-citation-snapshot',
        { pattern: '0 4 1 * *', tz: 'Asia/Makassar' },
        { name: JOB_TAKE_SNAPSHOT },
      );
      this.logger.log(
        'Jadwal terdaftar: sitasi harian 02.00 WITA, snapshot tiap tanggal 1 pukul 04.00.',
      );
    } catch (error) {
      this.logger.warn(
        `Gagal mendaftarkan jadwal: ${(error as Error).message}`,
      );
    }
  }

  /** Pemicu manual dari panel admin. */
  async enqueue(name: string): Promise<string> {
    const job = await this.queue.add(name, {}, { removeOnComplete: 100 });
    return job.id ?? '';
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close().catch(() => undefined);
  }
}

export { redisConnection };
