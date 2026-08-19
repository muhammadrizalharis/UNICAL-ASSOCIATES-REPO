import { Module } from '@nestjs/common';
import { DoiModule } from '../doi/doi.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { IdentifierResolverService } from './identifier-resolver.service';

@Module({
  imports: [DoiModule],
  controllers: [ImportController],
  providers: [ImportService, IdentifierResolverService],
  exports: [IdentifierResolverService],
})
export class ImportModule {}
