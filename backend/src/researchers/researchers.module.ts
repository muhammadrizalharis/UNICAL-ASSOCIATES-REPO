import { Global, Module } from '@nestjs/common';
import { ResearchersController } from './researchers.controller';
import { ResearchersService } from './researchers.service';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [ResearchersController],
  providers: [ResearchersService, MetricsService],
  exports: [MetricsService],
})
export class ResearchersModule {}
