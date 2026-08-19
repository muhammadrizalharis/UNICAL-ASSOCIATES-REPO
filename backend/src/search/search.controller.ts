import { Controller, Get, Query } from '@nestjs/common';
import { SearchParams, SearchService } from './search.service';

function toList(value?: string): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

@Controller({ version: '1' })
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('search')
  async find(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('index') index?: string,
    @Query('type') type?: string,
    @Query('year_from') yearFrom?: string,
    @Query('year_to') yearTo?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const params: SearchParams = {
      q,
      categories: toList(category),
      indexations: toList(index),
      type,
      yearFrom: yearFrom ? Number(yearFrom) : undefined,
      yearTo: yearTo ? Number(yearTo) : undefined,
      sort: sort as SearchParams['sort'],
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const result = await this.search.search(params);
    return { success: true, ...result };
  }

  @Get('search/suggest')
  async suggest(@Query('q') q?: string) {
    return { success: true, data: await this.search.suggest(q ?? '') };
  }
}
