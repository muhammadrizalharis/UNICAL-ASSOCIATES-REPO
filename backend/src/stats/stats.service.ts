import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.module';

const CACHE_KEY = 'stats:institution';
const CACHE_TTL_S = 600;

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async institution() {
    const cached = await this.cache.get<object>(CACHE_KEY);
    if (cached) return cached;

    const [
      totalPublications,
      totalResearchers,
      citationAgg,
      totalJournals,
      byYear,
      byFaculty,
      byType,
      byQuartile,
      topCited,
      trend,
    ] = await this.prisma.$transaction([
      this.prisma.publication.count({ where: { status: 'APPROVED' } }),
      this.prisma.researcherProfile.count({
        where: { unicalId: { not: null } },
      }),
      this.prisma.publication.aggregate({
        where: { status: 'APPROVED' },
        _sum: { citationCount: true },
      }),
      this.prisma.journal.count(),
      this.prisma.$queryRaw<{ year: number; total: bigint }[]>`
        SELECT EXTRACT(YEAR FROM published_date)::int AS year, count(*) AS total
        FROM publications
        WHERE status = 'APPROVED' AND published_date IS NOT NULL
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<
        {
          id: string;
          faculty: string;
          researchers: bigint;
          publications: bigint;
          citations: bigint;
        }[]
      >`
        SELECT f.id AS id, f.name AS faculty,
               (SELECT count(*) FROM researcher_profiles rp
                 WHERE rp.faculty_id = f.id AND rp.unical_id IS NOT NULL) AS researchers,
               agg.publications, agg.citations
        FROM faculties f
        LEFT JOIN LATERAL (
          SELECT count(*) AS publications, COALESCE(SUM(q.citation_count), 0) AS citations
          FROM (
            SELECT DISTINCT p.id, p.citation_count
            FROM publications p
            JOIN publication_authors pa ON pa.publication_id = p.id
            JOIN researcher_profiles rp ON rp.id = pa.researcher_id
            WHERE rp.faculty_id = f.id AND rp.unical_id IS NOT NULL
              AND p.status = 'APPROVED'
          ) q
        ) agg ON true
        WHERE EXISTS (SELECT 1 FROM researcher_profiles rp
                       WHERE rp.faculty_id = f.id AND rp.unical_id IS NOT NULL)
        ORDER BY agg.publications DESC`,
      this.prisma.publication.groupBy({
        by: ['type'],
        where: { status: 'APPROVED' },
        orderBy: { type: 'asc' },
        _count: true,
      }),
      this.prisma.$queryRaw<{ quartile: string; total: bigint }[]>`
        SELECT j.scopus_quartile::text AS quartile, count(*) AS total
        FROM publications p JOIN journals j ON j.id = p.journal_id
        WHERE p.status = 'APPROVED'
        GROUP BY 1 ORDER BY 1`,
      this.prisma.publication.findMany({
        where: { status: 'APPROVED' },
        orderBy: { citationCount: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          citationCount: true,
          publishedDate: true,
          journal: { select: { name: true } },
        },
      }),
      this.prisma.$queryRaw<{ date: Date; citations: bigint }[]>`
        SELECT cs.snapshot_date AS date, SUM(cs.citation_count) AS citations
        FROM citation_snapshots cs
        JOIN publications p ON p.id = cs.publication_id AND p.status = 'APPROVED'
        GROUP BY 1 ORDER BY 1`,
    ]);

    const result = {
      totals: {
        publications: totalPublications,
        researchers: totalResearchers,
        citations: citationAgg._sum.citationCount ?? 0,
        journals: totalJournals,
      },
      publicationsByYear: byYear.map((r) => ({
        year: r.year,
        total: Number(r.total),
      })),
      byFaculty: byFaculty.map((r) => ({
        id: r.id,
        faculty: r.faculty,
        researchers: Number(r.researchers),
        publications: Number(r.publications),
        citations: Number(r.citations),
      })),
      byType: byType.map((r) => ({ type: r.type, total: r._count })),
      byQuartile: byQuartile.map((r) => ({
        quartile: r.quartile,
        total: Number(r.total),
      })),
      topCited: topCited.map((p) => ({
        id: p.id,
        title: p.title,
        citationCount: p.citationCount,
        year: p.publishedDate?.getFullYear() ?? null,
        journal: p.journal?.name ?? null,
      })),
      citationTrend: trend.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        citations: Number(r.citations),
      })),
      generatedAt: new Date().toISOString(),
    };

    await this.cache.set(CACHE_KEY, result, CACHE_TTL_S);
    return result;
  }

  /** Rincian kinerja satu fakultas untuk laporan cetak. */
  async facultyReport(facultyId: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id: facultyId },
      select: { id: true, code: true, name: true },
    });
    if (!faculty) return null;

    const researchers = await this.prisma.researcherProfile.findMany({
      where: { facultyId, unicalId: { not: null } },
      orderBy: { totalCitations: 'desc' },
      select: {
        unicalId: true,
        fullName: true,
        hIndex: true,
        i10Index: true,
        totalCitations: true,
        department: { select: { name: true } },
        _count: { select: { authorships: true } },
      },
    });

    return {
      faculty,
      researchers: researchers.map((r) => ({
        unicalId: r.unicalId,
        fullName: r.fullName,
        department: r.department?.name ?? null,
        publications: r._count.authorships,
        citations: r.totalCitations,
        hIndex: r.hIndex,
        i10Index: r.i10Index,
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}
