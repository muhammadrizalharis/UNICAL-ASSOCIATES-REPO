import { Global, Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexService } from './search-index.service';

@Global()
@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchIndexService],
  exports: [SearchIndexService],
})
export class SearchModule {}
