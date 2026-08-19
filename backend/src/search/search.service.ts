import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SearchIndexService } from './search-index.service';

export interface SearchParams {
  q?: string;
  categories?: string[];
  indexations?: string[];
  type?: string;
  yearFrom?: number;
  yearTo?: number;
  sort?: 'relevance' | 'newest' | 'citations' | 'views';
  page?: number;
  limit?: number;
}

const SORT_MAP: Record<string, string[]> = {
  newest: ['publishedAt:desc'],
  citations: ['citationCount:desc'],
  views: ['viewCount:desc'],
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexService: SearchIndexService,
  ) {}

  async search(params: SearchParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const filters: string[] = [];
    if (params.categories?.length) {
      filters.push(
        `(${params.categories.map((c) => `categorySlugs = "${c}"`).join(' OR ')})`,
      );
    }
    if (params.indexations?.length) {
      filters.push(
        `(${params.indexations.map((i) => `indexations = "${i}"`).join(' OR ')})`,
      );
    }
    if (params.type) filters.push(`type = "${params.type}"`);
    if (params.yearFrom) filters.push(`year >= ${params.yearFrom}`);
    if (params.yearTo) filters.push(`year <= ${params.yearTo}`);

    try {
      const result = await this.indexService.index.search(params.q ?? '', {
        filter: filters.length ? filters.join(' AND ') : undefined,
        sort: params.sort ? SORT_MAP[params.sort] : undefined,
        facets: ['year', 'type', 'categorySlugs', 'indexations'],
        limit,
        offset: (page - 1) * limit,
      });

      return {
        data: result.hits,
        meta: {
          page,
          perPage: limit,
          total: result.estimatedTotalHits ?? result.hits.length,
          took: result.processingTimeMs,
          engine: 'meilisearch',
          facets: result.facetDistribution ?? {},
        },
      };
    } catch (error) {
      this.logger.warn(
        `Meilisearch tidak tersedia (${(error as Error).message}); beralih ke basis data.`,
      );
      return this.fallbackSearch(params, page, limit);
    }
  }

  /** Cadangan bila Meilisearch mati, agar pencarian tetap berfungsi. */
  private async fallbackSearch(
    params: SearchParams,
    page: number,
    limit: number,
  ) {
    const where = {
      status: 'APPROVED' as const,
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: 'insensitive' as const } },
              { abstract: { contains: params.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.publication.count({ where }),
      this.prisma.publication.findMany({
        where,
        orderBy: { publishedDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          journal: true,
          authors: { orderBy: { authorOrder: 'asc' } },
          indexations: { include: { indexation: true } },
        },
      }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        doi: row.doi,
        title: row.title,
        abstract: row.abstract ?? '',
        authors: row.authors.map((a) => a.rawAuthorName),
        journal: row.journal?.name ?? '',
        year: row.publishedDate?.getFullYear() ?? null,
        citationCount: row.citationCount,
        viewCount: row.viewCount,
        indexations: row.indexations.map((i) => i.indexation.code),
      })),
      meta: {
        page,
        perPage: limit,
        total,
        took: null,
        engine: 'postgres',
        facets: {},
      },
    };
  }

  /** Saran cepat untuk kotak pencarian. */
  async suggest(q: string) {
    if (!q.trim()) return [];

    try {
      const result = await this.indexService.index.search(q, {
        limit: 8,
        attributesToRetrieve: ['id', 'title', 'year'],
      });
      return result.hits;
    } catch {
      return [];
    }
  }
}
