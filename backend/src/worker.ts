import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import { AppModule } from './app.module';
import { CitationRefreshService } from './jobs/citation-refresh.service';
import {
  JOB_REFRESH_CITATIONS,
  JOB_TAKE_SNAPSHOT,
  MAINTENANCE_QUEUE,
  redisConnection,
} from './jobs/jobs-queue.service';

/**
 * Entry point container unical-worker: mengonsumsi antrean pemeliharaan.
 * Memakai application context (tanpa HTTP) di atas modul yang sama dengan API.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const refresher = app.get(CitationRefreshService);

  const worker = new Worker(
    MAINTENANCE_QUEUE,
    async (job) => {
      logger.log(`Menjalankan job ${job.name} (#${job.id})`);

      switch (job.name) {
        case JOB_REFRESH_CITATIONS:
          return refresher.refreshBatch();
        case JOB_TAKE_SNAPSHOT:
          return refresher.takeSnapshot();
        default:
          logger.warn(`Job tidak dikenal: ${job.name}`);
          return null;
      }
    },
    { connection: redisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job, result) => {
    logger.log(`Selesai ${job.name}: ${JSON.stringify(result)}`);
  });
  worker.on('failed', (job, error) => {
    logger.error(`Gagal ${job?.name}: ${error.message}`);
  });

  const shutdown = async () => {
    await worker.close();
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());

  logger.log('unical-worker siap mengonsumsi antrean.');
}

void bootstrap();
