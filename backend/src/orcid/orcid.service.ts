import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DoiResolverService } from '../doi/doi-resolver.service';
import { normalizeDoi } from '../doi/doi.util';
import { namesLooselyMatch } from './name-match.util';
import { SearchIndexService } from '../search/search-index.service';
import { MetricsService } from '../researchers/metrics.service';

const ORCID_API = 'https://pub.orcid.org/v3.0';
const ORCID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

export interface OrcidImportItem {
  doi: string;
  title: string;
  status: 'imported' | 'linked' | 'duplicate' | 'failed';
  message?: string;
}

@Injectable()
export class OrcidService {
  private readonly logger = new Logger(OrcidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: DoiResolverService,
    private readonly searchIndex: SearchIndexService,
    private readonly metrics: MetricsService,
  ) {}

  private async fetchOrcid<T>(path: string): Promise<T> {
    const response = await fetch(`${ORCID_API}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `UNICAL-ASSOCIATES-REPO (mailto:${process.env.CROSSREF_MAILTO ?? 'admin@unismuh.ac.id'})`,
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new BadRequestException({
        code: 'ORCID_UNAVAILABLE',
        message: `ORCID membalas ${response.status}.`,
      });
    }

    return (await response.json()) as T;
  }

  /** Mengambil daftar DOI karya dari sebuah ORCID iD. */
  async listWorkDois(orcid: string): Promise<{ doi: string; title: string }[]> {
    if (!ORCID_PATTERN.test(orcid)) {
      throw new BadRequestException({
        code: 'ORCID_INVALID',
        message: 'Format ORCID iD tidak valid. Contoh: 0000-0003-1469-9468',
      });
    }

    const body = await this.fetchOrcid<{
      group?: {
        'external-ids'?: { 'external-id'?: Record<string, any>[] };
        'work-summary'?: { title?: { title?: { value?: string } } }[];
      }[];
    }>(`/${orcid}/works`);

    const works: { doi: string; title: string }[] = [];
    for (const group of body.group ?? []) {
      const title =
        group['work-summary']?.[0]?.title?.title?.value ?? '(tanpa judul)';
      const rawDoi = group['external-ids']?.['external-id']?.find(
        (e) => e['external-id-type'] === 'doi',
      )?.['external-id-value'];

      const doi = normalizeDoi(rawDoi);
      if (doi) works.push({ doi, title });
    }

    return works;
  }

  /**
   * Menautkan ORCID ke profil lalu langsung mengimpor seluruh karyanya —
   * dipakai saat login pertama admin agar sekali klik tuntas tersinkron.
   */
  async linkAndSync(userId: string, orcid: string) {
    const profile = await this.prisma.researcherProfile.update({
      where: { userId },
      data: { orcid, orcidSyncedAt: new Date() },
      select: { id: true },
    });

    const works = await this.importWorks(profile.id);

    return { orcid, works };
  }

  /**
   * Mengimpor seluruh karya ber-DOI milik peneliti dari ORCID tertautnya.
   * Karya diverifikasi lewat rantai CrossRef sehingga metadatanya resmi,
   * lalu slot penulis ditautkan berdasarkan ORCID atau kecocokan nama.
   */
  async importWorks(profileId: string): Promise<{
    orcid: string;
    total: number;
    items: OrcidImportItem[];
  }> {
    const profile = await this.prisma.researcherProfile.findUnique({
      where: { id: profileId },
      select: { id: true, orcid: true, fullName: true, userId: true },
    });

    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Profil peneliti tidak ditemukan.',
      });
    }
    if (!profile.orcid) {
      throw new BadRequestException({
        code: 'ORCID_NOT_LINKED',
        message: 'Peneliti ini belum menautkan ORCID iD.',
      });
    }

    const works = await this.listWorkDois(profile.orcid);
    const items: OrcidImportItem[] = [];

    for (const work of works) {
      try {
        items.push(await this.importOne(profile, work.doi, work.title));
      } catch (error) {
        items.push({
          doi: work.doi,
          title: work.title,
          status: 'failed',
          message: (error as Error).message,
        });
      }
    }

    await this.metrics.recalculate(profile.id);

    return { orcid: profile.orcid, total: items.length, items };
  }

  private async importOne(
    profile: { id: string; orcid: string | null; fullName: string; userId: string },
    doi: string,
    fallbackTitle: string,
  ): Promise<OrcidImportItem> {
    const existing = await this.prisma.publication.findUnique({
      where: { doi },
      select: { id: true, title: true },
    });

    // DOI yang sudah ada cukup ditautkan ke slot penulis yang cocok.
    if (existing) {
      const linked = await this.linkAuthorship(existing.id, profile);
      return {
        doi,
        title: existing.title,
        status: linked ? 'linked' : 'duplicate',
        message: linked
          ? 'Sudah ada; slot penulis ditautkan.'
          : 'Sudah ada dan sudah tertaut.',
      };
    }

    const meta = await this.resolver.resolve(doi);

    const journalId = meta.journal.name
      ? await this.findOrCreateJournal(meta.journal)
      : null;

    const publication = await this.prisma.publication.create({
      data: {
        doi,
        title: meta.title === '(tanpa judul)' ? fallbackTitle : meta.title,
        abstract: meta.abstract,
        type: meta.type,
        journalId,
        volume: meta.volume,
        issue: meta.issue,
        pages: meta.pages,
        publishedDate: meta.publishedDate ? new Date(meta.publishedDate) : null,
        keywords: meta.keywords,
        url: meta.url,
        citationCount: meta.citationCount,
        // Impor dari ORCID milik sendiri yang dipicu admin dianggap terverifikasi.
        status: 'APPROVED',
        submittedById: profile.userId,
        metadataRaw: meta.raw as object,
        authors: {
          create: meta.authors.map((author) => ({
            rawAuthorName: author.name,
            authorOrder: author.order,
            isCorresponding: author.isCorresponding,
            affiliationRaw: author.affiliation,
            researcherId: this.matches(author, profile) ? profile.id : null,
          })),
        },
      },
      select: { id: true, title: true, status: true },
    });

    // Bila CrossRef tidak menyebut penulis sama sekali, buat slot untuk pemilik.
    const linkedCount = await this.prisma.publicationAuthor.count({
      where: { publicationId: publication.id, researcherId: profile.id },
    });
    if (linkedCount === 0) {
      await this.linkAuthorship(publication.id, profile);
    }

    await this.searchIndex.sync(publication.id, publication.status);

    return { doi, title: publication.title, status: 'imported' };
  }

  /** ORCID pada metadata adalah bukti terkuat; nama hanyalah cadangan. */
  private matches(
    author: { name: string; orcid: string | null },
    profile: { orcid: string | null; fullName: string },
  ): boolean {
    if (author.orcid && profile.orcid) {
      return author.orcid.toUpperCase() === profile.orcid.toUpperCase();
    }
    return namesLooselyMatch(author.name, profile.fullName);
  }

  private async linkAuthorship(
    publicationId: string,
    profile: { id: string; orcid: string | null; fullName: string },
  ): Promise<boolean> {
    const slots = await this.prisma.publicationAuthor.findMany({
      where: { publicationId },
      select: { id: true, rawAuthorName: true, researcherId: true, authorOrder: true },
      orderBy: { authorOrder: 'asc' },
    });

    if (slots.some((s) => s.researcherId === profile.id)) return false;

    const bySlotName = slots.find(
      (s) =>
        !s.researcherId && namesLooselyMatch(s.rawAuthorName, profile.fullName),
    );

    if (bySlotName) {
      await this.prisma.publicationAuthor.update({
        where: { id: bySlotName.id },
        data: { researcherId: profile.id },
      });
      return true;
    }

    // Tidak ada slot yang cocok; tambahkan di urutan berikutnya.
    const nextOrder = (slots.at(-1)?.authorOrder ?? 0) + 1;
    await this.prisma.publicationAuthor.create({
      data: {
        publicationId,
        researcherId: profile.id,
        rawAuthorName: profile.fullName,
        authorOrder: nextOrder,
        isCorresponding: false,
      },
    });
    return true;
  }

  private async findOrCreateJournal(journal: {
    name: string | null;
    publisher: string | null;
    issn: string | null;
    eissn: string | null;
  }): Promise<string | null> {
    if (!journal.name) return null;

    if (journal.issn) {
      const byIssn = await this.prisma.journal.findUnique({
        where: { issn: journal.issn },
        select: { id: true },
      });
      if (byIssn) return byIssn.id;
    }

    const byName = await this.prisma.journal.findFirst({
      where: { name: journal.name },
      select: { id: true },
    });
    if (byName) return byName.id;

    const created = await this.prisma.journal.create({
      data: {
        name: journal.name,
        publisher: journal.publisher,
        issn: journal.issn,
        eissn: journal.eissn,
      },
      select: { id: true },
    });
    return created.id;
  }
}
