import { Module } from '@nestjs/common';
import { DoiModule } from '../doi/doi.module';
import { PublicationsController } from './publications.controller';
import { PublicationsService } from './publications.service';

@Module({
  imports: [DoiModule],
  controllers: [PublicationsController],
  providers: [PublicationsService],
})
export class PublicationsModule {}
