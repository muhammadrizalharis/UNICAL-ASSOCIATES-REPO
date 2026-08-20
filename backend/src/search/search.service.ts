import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.module';
import { SearchIndexService } from './search-index.service';

export interface SearchParams {
  q?: string;
  author?: string;
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
    private readonly cache: CacheService,
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

    // Pencarian khusus kolom penulis; digabung bila q umum juga terisi.
    const authorOnly = Boolean(params.author && !params.q);
    const query = authorOnly
      ? (params.author ?? '')
      : [params.q, params.author].filter(Boolean).join(' ');

    try {
      const result = await this.indexService.index.search(query, {
        filter: filters.length ? filters.join(' AND ') : undefined,
        sort: params.sort ? SORT_MAP[params.sort] : undefined,
        facets: ['year', 'type', 'categorySlugs', 'indexations'],
        attributesToSearchOn: authorOnly ? ['authors'] : undefined,
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
      ...(params.author
        ? {
            authors: {
              some: {
                rawAuthorName: {
                  contains: params.author,
                  mode: 'insensitive' as const,
                },
              },
            },
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

  /** Artikel terkait berbasis konten: judul + kata kunci sebagai kueri. */
  async related(publicationId: string) {
    const cacheKey = `related:${publicationId}`;
    const cached = await this.cache.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      select: { title: true, keywords: true },
    });
    if (!publication) return [];

    const keywords = Array.isArray(publication.keywords)
      ? (publication.keywords as string[]).slice(0, 5).join(' ')
      : '';

    try {
      const result = await this.indexService.index.search(
        `${publication.title} ${keywords}`.slice(0, 300),
        {
          limit: 6,
          attributesToRetrieve: [
            'id',
            'title',
            'journal',
            'year',
            'citationCount',
          ],
        },
      );
      const hits = result.hits
        .filter((hit) => (hit as { id: string }).id !== publicationId)
        .slice(0, 5);
      await this.cache.set(cacheKey, hits, 600);
      return hits;
    } catch {
      return [];
    }
  }
}
