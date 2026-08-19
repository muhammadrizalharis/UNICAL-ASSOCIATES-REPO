import { Global, Module } from '@nestjs/common';
import { ResearchersController } from './researchers.controller';
import { ResearchersService } from './researchers.service';
import { MetricsService } from './metrics.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [ResearchersController],
  providers: [ResearchersService, MetricsService],
  exports: [MetricsService, ResearchersService],
})
export class ResearchersModule {}
