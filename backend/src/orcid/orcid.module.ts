import { Module } from '@nestjs/common';
import { DoiModule } from '../doi/doi.module';
import { ResearchersModule } from '../researchers/researchers.module';
import { OrcidController } from './orcid.controller';
import { OrcidService } from './orcid.service';

@Module({
  imports: [DoiModule, ResearchersModule],
  controllers: [OrcidController],
  providers: [OrcidService],
  exports: [OrcidService],
})
export class OrcidModule {}
