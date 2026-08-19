import { Global, Module } from '@nestjs/common';
import { CitationRefreshService } from './citation-refresh.service';
import { JobsQueueService } from './jobs-queue.service';

@Global()
@Module({
  providers: [CitationRefreshService, JobsQueueService],
  exports: [CitationRefreshService, JobsQueueService],
})
export class JobsModule {}
