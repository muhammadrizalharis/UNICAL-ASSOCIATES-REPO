import { Injectable, Logger } from '@nestjs/common';
import { extractText, getDocumentProxy } from 'unpdf';
import { DoiResolverService } from '../doi/doi-resolver.service';
import { ResolvedPublication } from '../doi/doi.types';
import { DetectedIdentifier, extractDoiFromText } from './identifier.util';

@Injectable()
export class IdentifierResolverService {
  private readonly logger = new Logger(IdentifierResolverService.name);

  constructor(private readonly doiResolver: DoiResolverService) {}

  /** Semua jenis identifier pada akhirnya dipetakan ke DOI bila memungkinkan. */
  async resolve(identifier: DetectedIdentifier): Promise<ResolvedPublication> {
    switch (identifier.kind) {
      case 'doi':
        return this.doiResolver.resolve(identifier.value);

      case 'arxiv': {
        const doi = `10.48550/arxiv.${identifier.value}`;
        return this.doiResolver.resolve(doi);
      }

      case 'pmid':
      case 'pmcid': {
        const doi = await this.doiFromPubmed(identifier);
        if (!doi) {
          throw new Error(
            `Tidak menemukan DOI untuk ${identifier.kind.toUpperCase()} ${identifier.value}`,
          );
        }
        return this.doiResolver.resolve(doi);
      }

      case 'isbn': {
        const doi = await this.doiFromIsbn(identifier.value);
        if (!doi) {
          throw new Error(`Tidak menemukan DOI untuk ISBN ${identifier.value}`);
        }
        return this.doiResolver.resolve(doi);
      }
    }
  }

  /**
   * E-utilities dipakai alih-alih layanan idconv PMC, karena idconv hanya
   * mencakup artikel yang tersimpan di PMC dan URL lamanya sudah dipindahkan.
   */
  private async doiFromPubmed(
    identifier: DetectedIdentifier,
  ): Promise<string | null> {
    const isPmc = identifier.kind === 'pmcid';
    const id = isPmc ? identifier.value.replace(/^PMC/i, '') : identifier.value;
    const db = isPmc ? 'pmc' : 'pubmed';
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=${db}&id=${id}&retmode=json`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return null;

      const body = (await response.json()) as {
        result?: Record<
          string,
          { articleids?: { idtype: string; value: string }[] }
        >;
      };

      const record = body.result?.[id];
      const doi = record?.articleids?.find((a) => a.idtype === 'doi')?.value;
      return doi ?? null;
    } catch (error) {
      this.logger.warn(`Konversi PubMed gagal: ${(error as Error).message}`);
      return null;
    }
  }

  private async doiFromIsbn(isbn: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.crossref.org/works?filter=isbn:${isbn}&rows=1`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (!response.ok) return null;

      const body = (await response.json()) as {
        message?: { items?: { DOI?: string }[] };
      };
      return body.message?.items?.[0]?.DOI ?? null;
    } catch (error) {
      this.logger.warn(`Pencarian ISBN gagal: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Membaca DOI dari isi PDF. Halaman awal diperiksa lebih dulu karena DOI
   * hampir selalu tercetak di header atau footer halaman pertama.
   */
  async doiFromPdf(buffer: Buffer): Promise<{
    doi: string | null;
    title: string | null;
    pages: number;
  }> {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    const head = text.slice(0, 8000);
    const doi = extractDoiFromText(head) ?? extractDoiFromText(text);

    // Baris pertama yang cukup panjang biasanya adalah judul artikel.
    const title =
      text
        .split(/\n+/)
        .map((line) => line.trim())
        .find((line) => line.length > 25 && line.length < 300) ?? null;

    return { doi, title, pages: totalPages };
  }
}
