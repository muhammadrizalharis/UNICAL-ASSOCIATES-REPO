import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MetricsService } from '../researchers/metrics.service';
import { SearchIndexService } from '../search/search-index.service';

const BATCH_SIZE = 50;

@Injectable()
export class CitationRefreshService {
  private readonly logger = new Logger(CitationRefreshService.name);
  private readonly mailto =
    process.env.CROSSREF_MAILTO ?? 'admin@unismuh.ac.id';

  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly searchIndex: SearchIndexService,
  ) {}

  /**
   * Memperbarui jumlah sitasi satu batch publikasi yang paling lama tidak
   * disegarkan. Dipanggil harian sehingga seluruh koleksi ter-refresh bergilir.
   */
  async refreshBatch(): Promise<{
    processed: number;
    changed: number;
    failed: number;
  }> {
    const batch = await this.prisma.publication.findMany({
      where: { status: 'APPROVED' },
      orderBy: { updatedAt: 'asc' },
      take: BATCH_SIZE,
      select: { id: true, doi: true, citationCount: true },
    });

    let changed = 0;
    let failed = 0;
    const touchedProfiles = new Set<string>();

    for (const publication of batch) {
      const latest = await this.citedByCount(publication.doi);

      if (latest === null) {
        failed++;
        continue;
      }

      if (latest !== publication.citationCount) {
        await this.prisma.publication.update({
          where: { id: publication.id },
          data: { citationCount: latest },
        });
        await this.searchIndex.sync(publication.id, 'APPROVED');
        changed++;

        const authors = await this.prisma.publicationAuthor.findMany({
          where: { publicationId: publication.id, researcherId: { not: null } },
          select: { researcherId: true },
        });
        for (const author of authors) {
          if (author.researcherId) touchedProfiles.add(author.researcherId);
        }
      } else {
        // Sentuh updatedAt agar giliran batch berikutnya adil.
        await this.prisma.publication.update({
          where: { id: publication.id },
          data: { updatedAt: new Date() },
        });
      }

      // Jeda sopan agar tidak membebani OpenAlex.
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    for (const profileId of touchedProfiles) {
      await this.metrics.recalculate(profileId);
    }

    this.logger.log(
      `Sitasi: ${batch.length} diperiksa, ${changed} berubah, ${failed} gagal, ${touchedProfiles.size} profil dihitung ulang.`,
    );

    return { processed: batch.length, changed, failed };
  }

  /** Snapshot bulanan untuk grafik tren sitasi. */
  async takeSnapshot(): Promise<{ saved: number }> {
    const publications = await this.prisma.publication.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, citationCount: true },
    });

    const snapshotDate = new Date();
    snapshotDate.setUTCDate(1);
    snapshotDate.setUTCHours(0, 0, 0, 0);

    let saved = 0;
    for (const publication of publications) {
      await this.prisma.citationSnapshot.upsert({
        where: {
          publicationId_snapshotDate: {
            publicationId: publication.id,
            snapshotDate,
          },
        },
        update: { citationCount: publication.citationCount },
        create: {
          publicationId: publication.id,
          citationCount: publication.citationCount,
          snapshotDate,
        },
      });
      saved++;
    }

    this.logger.log(`Snapshot bulanan: ${saved} publikasi.`);
    return { saved };
  }

  private async citedByCount(doi: string): Promise<number | null> {
    try {
      const response = await fetch(
        `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?select=cited_by_count&mailto=${encodeURIComponent(this.mailto)}`,
        { signal: AbortSignal.timeout(15_000) },
      );

      if (response.status === 404) return null;
      if (!response.ok) return null;

      const body = (await response.json()) as { cited_by_count?: number };
      return body.cited_by_count ?? null;
    } catch {
      return null;
    }
  }
}
