import { Injectable, Logger } from '@nestjs/common';
import {
  ResolvedAuthor,
  ResolvedPublication,
  ResolvedType,
} from './doi.types';
import {
  abstractFromInvertedIndex,
  cleanAbstract,
  dateFromParts,
  mapCrossrefType,
} from './doi.util';

const REQUEST_TIMEOUT_MS = 15_000;

interface CrossrefAuthor {
  given?: string;
  family?: string;
  name?: string;
  sequence?: string;
  ORCID?: string;
  affiliation?: { name?: string }[];
}

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  abstract?: string;
  type?: string;
  'container-title'?: string[];
  publisher?: string;
  ISSN?: string[];
  'issn-type'?: { value: string; type: string }[];
  volume?: string;
  issue?: string;
  page?: string;
  author?: CrossrefAuthor[];
  subject?: string[];
  URL?: string;
  'is-referenced-by-count'?: number;
  license?: unknown[];
  published?: { 'date-parts'?: number[][] };
  'published-print'?: { 'date-parts'?: number[][] };
  'published-online'?: { 'date-parts'?: number[][] };
  created?: { 'date-parts'?: number[][] };
}

export class DoiNotFoundError extends Error {
  constructor(readonly doi: string) {
    super(`DOI ${doi} tidak ditemukan di CrossRef maupun DataCite`);
  }
}

@Injectable()
export class DoiResolverService {
  private readonly logger = new Logger(DoiResolverService.name);
  private readonly mailto =
    process.env.CROSSREF_MAILTO ?? 'admin@unismuh.ac.id';

  /**
   * Mengambil metadata sebuah DOI. Metadata utama berasal dari CrossRef dengan
   * cadangan DataCite. Abstrak sering kosong di CrossRef sehingga dilengkapi
   * berurutan dari OpenAlex lalu Semantic Scholar.
   */
  async resolve(doi: string): Promise<ResolvedPublication> {
    const work = await this.fetchCrossref(doi);

    const resolved = work
      ? this.mapCrossref(doi, work)
      : await this.resolveFromDataCite(doi);

    if (!resolved.abstract) {
      await this.enrichAbstract(resolved);
    }

    return resolved;
  }

  private async fetchJson<T>(url: string, retries = 2): Promise<T | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': `UNICAL-ASSOCIATES-REPO (mailto:${this.mailto})`,
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.status === 404) return null;

        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries) {
            await this.delay(500 * 2 ** attempt);
            continue;
          }
          this.logger.warn(`${url} membalas ${response.status}, menyerah`);
          return null;
        }

        if (!response.ok) {
          this.logger.warn(`${url} membalas ${response.status}`);
          return null;
        }

        return (await response.json()) as T;
      } catch (error) {
        if (attempt < retries) {
          await this.delay(500 * 2 ** attempt);
          continue;
        }
        this.logger.warn(
          `Gagal menghubungi ${url}: ${(error as Error).message}`,
        );
        return null;
      }
    }

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchCrossref(doi: string): Promise<CrossrefWork | null> {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(this.mailto)}`;
    const body = await this.fetchJson<{ message?: CrossrefWork }>(url);
    return body?.message ?? null;
  }

  private mapCrossref(doi: string, work: CrossrefWork): ResolvedPublication {
    const issnPrint = work['issn-type']?.find((i) => i.type === 'print')?.value;
    const issnElectronic = work['issn-type']?.find(
      (i) => i.type === 'electronic',
    )?.value;

    return {
      doi,
      title: work.title?.[0]?.trim() ?? '(tanpa judul)',
      abstract: cleanAbstract(work.abstract),
      type: mapCrossrefType(work.type),
      journal: {
        name: work['container-title']?.[0] ?? null,
        publisher: work.publisher ?? null,
        issn: issnPrint ?? work.ISSN?.[0] ?? null,
        eissn: issnElectronic ?? work.ISSN?.[1] ?? null,
      },
      authors: this.mapAuthors(work.author),
      volume: work.volume ?? null,
      issue: work.issue ?? null,
      pages: work.page ?? null,
      publishedDate:
        dateFromParts(work.published?.['date-parts']) ??
        dateFromParts(work['published-print']?.['date-parts']) ??
        dateFromParts(work['published-online']?.['date-parts']) ??
        dateFromParts(work.created?.['date-parts']),
      keywords: work.subject ?? [],
      url: work.URL ?? null,
      citationCount: work['is-referenced-by-count'] ?? 0,
      isOpenAccess: (work.license?.length ?? 0) > 0,
      sources: {
        metadata: 'crossref',
        abstract: cleanAbstract(work.abstract) ? 'crossref' : null,
      },
      raw: work,
    };
  }

  private mapAuthors(authors: CrossrefAuthor[] | undefined): ResolvedAuthor[] {
    if (!authors?.length) return [];

    return authors.map((author, index) => {
      const name =
        author.name ??
        [author.given, author.family].filter(Boolean).join(' ').trim();

      return {
        name: name.length > 0 ? name : '(nama tidak tercatat)',
        order: index + 1,
        isCorresponding: author.sequence === 'first',
        affiliation: author.affiliation?.[0]?.name ?? null,
        orcid: author.ORCID
          ? author.ORCID.replace(/^https?:\/\/orcid\.org\//i, '')
          : null,
      };
    });
  }

  private async resolveFromDataCite(
    doi: string,
  ): Promise<ResolvedPublication> {
    const body = await this.fetchJson<{
      data?: { attributes?: Record<string, any> };
    }>(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`);

    const attr = body?.data?.attributes;
    if (!attr) throw new DoiNotFoundError(doi);

    const authors: ResolvedAuthor[] = (attr.creators ?? []).map(
      (creator: Record<string, any>, index: number) => ({
        name:
          creator.name ??
          [creator.givenName, creator.familyName].filter(Boolean).join(' '),
        order: index + 1,
        isCorresponding: index === 0,
        affiliation: creator.affiliation?.[0]?.name ?? null,
        orcid:
          creator.nameIdentifiers?.find(
            (n: Record<string, any>) => n.nameIdentifierScheme === 'ORCID',
          )?.nameIdentifier?.replace(/^https?:\/\/orcid\.org\//i, '') ?? null,
      }),
    );

    const publishedYear: number | undefined = attr.publicationYear;

    return {
      doi,
      title: attr.titles?.[0]?.title ?? '(tanpa judul)',
      abstract: cleanAbstract(
        attr.descriptions?.find(
          (d: Record<string, any>) => d.descriptionType === 'Abstract',
        )?.description,
      ),
      type: 'PREPRINT' as ResolvedType,
      journal: {
        name: attr.publisher?.name ?? attr.publisher ?? null,
        publisher: attr.publisher?.name ?? attr.publisher ?? null,
        issn: null,
        eissn: null,
      },
      authors,
      volume: null,
      issue: null,
      pages: null,
      publishedDate: publishedYear ? `${publishedYear}-01-01` : null,
      keywords: (attr.subjects ?? [])
        .map((s: Record<string, any>) => s.subject)
        .filter(Boolean),
      url: attr.url ?? null,
      citationCount: attr.citationCount ?? 0,
      isOpenAccess: Boolean(attr.rightsList?.length),
      sources: { metadata: 'datacite', abstract: null },
      raw: attr,
    };
  }

  /** Rantai pelengkap abstrak: OpenAlex lalu Semantic Scholar. */
  private async enrichAbstract(
    publication: ResolvedPublication,
  ): Promise<void> {
    const openAlex = await this.fetchJson<{
      abstract_inverted_index?: Record<string, number[]>;
      topics?: { display_name: string }[];
    }>(
      `https://api.openalex.org/works/doi:${encodeURIComponent(publication.doi)}?mailto=${encodeURIComponent(this.mailto)}`,
    );

    // Topik OpenAlex dipakai karena field subject CrossRef hampir selalu kosong.
    if (publication.keywords.length === 0 && openAlex?.topics?.length) {
      publication.keywords = openAlex.topics
        .slice(0, 6)
        .map((t) => t.display_name);
    }

    const fromOpenAlex = abstractFromInvertedIndex(
      openAlex?.abstract_inverted_index,
    );
    if (fromOpenAlex) {
      publication.abstract = fromOpenAlex;
      publication.sources.abstract = 'openalex';
      return;
    }

    // Semantic Scholar menolak slash yang di-encode (%2F) dengan balasan 429,
    // jadi DOI disisipkan apa adanya. Aman karena sudah lolos validasi regex.
    const semantic = await this.fetchJson<{ abstract?: string }>(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${publication.doi}?fields=abstract`,
    );

    const fromSemantic = cleanAbstract(semantic?.abstract);
    if (fromSemantic) {
      publication.abstract = fromSemantic;
      publication.sources.abstract = 'semanticscholar';
    }
  }
}
