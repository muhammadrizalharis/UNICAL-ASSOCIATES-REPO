import { Module } from '@nestjs/common';
import { DoiController } from './doi.controller';
import { DoiResolverService } from './doi-resolver.service';

@Module({
  controllers: [DoiController],
  providers: [DoiResolverService],
  exports: [DoiResolverService],
})
export class DoiModule {}
