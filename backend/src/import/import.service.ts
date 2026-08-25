import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ResolvedPublication } from '../doi/doi.types';
import { IdentifierResolverService } from './identifier-resolver.service';
import { detectIdentifier } from './identifier.util';
import { parseBibliography, ParsedReference } from './bibliography.parser';
import { ManualReferenceDto } from './dto/import.dto';

export interface ImportItem {
  input: string;
  status: 'ok' | 'duplicate' | 'invalid' | 'failed';
  message?: string;
  data?: ResolvedPublication | Record<string, unknown>;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: IdentifierResolverService,
  ) {}

  /** Memproses banyak identifier campuran: DOI, arXiv, PMID, PMCID, ISBN. */
  async resolveIdentifiers(inputs: string[]): Promise<ImportItem[]> {
    const results: ImportItem[] = [];

    for (const raw of inputs) {
      const input = raw.trim();
      if (!input) continue;

      const identifier = detectIdentifier(input);
      if (!identifier) {
        results.push({
          input,
          status: 'invalid',
          message: 'Bukan DOI, arXiv, PMID, PMCID, maupun ISBN yang sah.',
        });
        continue;
      }

      try {
        const data = await this.resolver.resolve(identifier);

        const existing = await this.prisma.publication.findUnique({
          where: { doi: data.doi },
          select: { id: true },
        });

        results.push(
          existing
            ? {
                input,
                status: 'duplicate',
                message: 'Sudah terdaftar di UNICAL.',
                data: { publicationId: existing.id, title: data.title },
              }
            : { input, status: 'ok', data },
        );
      } catch (error) {
        results.push({
          input,
          status: 'failed',
          message: (error as Error).message,
        });
      }
    }

    return results;
  }

  /** Impor berkas pustaka .bib, .ris, .enw, atau daftar identifier .txt/.csv. */
  async importLibrary(filename: string, content: string) {
    const references = parseBibliography(content);

    if (references.length === 0) {
      // Berkas tanpa struktur pustaka diperlakukan sebagai daftar identifier.
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.split(/[,;\t]/)[0].trim())
        .filter(Boolean)
        .slice(0, 200);

      return {
        filename,
        format: 'daftar-identifier',
        total: lines.length,
        items: await this.resolveIdentifiers(lines),
      };
    }

    const withDoi = references.filter((r) => r.doi);
    const withoutDoi = references.filter((r) => !r.doi);

    const resolved = await this.resolveIdentifiers(
      withDoi.map((r) => r.doi as string),
    );

    // Entri tanpa DOI tetap dipakai apa adanya dari berkas pustaka.
    const manual: ImportItem[] = withoutDoi.map((r) => ({
      input: r.title ?? '(tanpa judul)',
      status: 'ok',
      message: 'Tanpa DOI, metadata diambil dari berkas.',
      data: this.fromParsed(r),
    }));

    return {
      filename,
      format: content.includes('TY  -') ? 'ris' : 'bibtex',
      total: references.length,
      items: [...resolved, ...manual],
    };
  }

  async fromPdf(filename: string, buffer: Buffer) {
    const { doi, title, pages } = await this.resolver.doiFromPdf(buffer);

    if (!doi) {
      return {
        filename,
        pages,
        status: 'no-doi' as const,
        message:
          'DOI tidak ditemukan di dalam PDF. Gunakan input manual atau masukkan DOI langsung.',
        guessedTitle: title,
      };
    }

    const [item] = await this.resolveIdentifiers([doi]);
    return { filename, pages, foundDoi: doi, ...item };
  }

  buildManual(dto: ManualReferenceDto): Record<string, unknown> {
    return {
      doi: null,
      title: dto.title,
      abstract: dto.abstract ?? null,
      type: 'JOURNAL_ARTICLE',
      journal: { name: dto.journal ?? null, publisher: null, issn: null },
      authors: dto.authors.map((name, index) => ({
        name,
        order: index + 1,
        isCorresponding: index === 0,
        affiliation: null,
      })),
      volume: dto.volume ?? null,
      issue: dto.issue ?? null,
      pages: dto.pages ?? null,
      publishedDate: dto.year ? `${dto.year}-01-01` : null,
      keywords: dto.keywords ?? [],
      url: dto.url ?? null,
      citationCount: 0,
      sources: { metadata: 'manual', abstract: dto.abstract ? 'manual' : null },
    };
  }

  private fromParsed(ref: ParsedReference): Record<string, unknown> {
    return {
      doi: null,
      title: ref.title,
      abstract: ref.abstract,
      journal: { name: ref.journal, publisher: null, issn: null },
      authors: ref.authors.map((name, index) => ({
        name,
        order: index + 1,
        isCorresponding: index === 0,
        affiliation: null,
      })),
      volume: ref.volume,
      issue: ref.issue,
      pages: ref.pages,
      publishedDate: ref.year ? `${ref.year}-01-01` : null,
      keywords: ref.keywords,
      url: ref.url,
      citationCount: 0,
      sources: {
        metadata: 'berkas-pustaka',
        abstract: ref.abstract ? 'berkas-pustaka' : null,
      },
    };
  }
}
