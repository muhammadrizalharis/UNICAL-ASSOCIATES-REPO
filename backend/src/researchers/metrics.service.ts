import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * h-index: jumlah h publikasi yang masing-masing disitasi minimal h kali.
   */
  static hIndex(citations: number[]): number {
    const sorted = [...citations].sort((a, b) => b - a);

    let h = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] >= i + 1) h = i + 1;
      else break;
    }

    return h;
  }

  /** i10-index: jumlah publikasi dengan sitasi minimal 10. */
  static i10Index(citations: number[]): number {
    return citations.filter((c) => c >= 10).length;
  }

  /** Hanya publikasi ter-approve yang dihitung ke dalam metrik. */
  async recalculate(researcherId: string): Promise<{
    hIndex: number;
    i10Index: number;
    totalCitations: number;
    totalPublications: number;
  }> {
    const rows = await this.prisma.publicationAuthor.findMany({
      where: { researcherId, publication: { status: 'APPROVED' } },
      select: { publication: { select: { citationCount: true } } },
    });

    const citations = rows.map((r) => r.publication.citationCount);
    const result = {
      hIndex: MetricsService.hIndex(citations),
      i10Index: MetricsService.i10Index(citations),
      totalCitations: citations.reduce((sum, c) => sum + c, 0),
      totalPublications: citations.length,
    };

    await this.prisma.researcherProfile.update({
      where: { id: researcherId },
      data: {
        hIndex: result.hIndex,
        i10Index: result.i10Index,
        totalCitations: result.totalCitations,
      },
    });

    return result;
  }

  /** Dipanggil setelah moderasi karena status publikasi ikut menentukan metrik. */
  async recalculateForPublication(publicationId: string): Promise<void> {
    const authors = await this.prisma.publicationAuthor.findMany({
      where: { publicationId, researcherId: { not: null } },
      select: { researcherId: true },
    });

    for (const author of authors) {
      if (author.researcherId) await this.recalculate(author.researcherId);
    }
  }
}
