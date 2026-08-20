import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Meilisearch, Index } from 'meilisearch';
import { PrismaService } from '../common/prisma/prisma.service';

export interface PublicationDocument {
  id: string;
  doi: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: number | null;
  publishedAt: number;
  type: string;
  categories: string[];
  categorySlugs: string[];
  indexations: string[];
  citationCount: number;
  viewCount: number;
}

const INDEX = 'publications';

@Injectable()
export class SearchIndexService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexService.name);
  private readonly client: Meilisearch;

  constructor(private readonly prisma: PrismaService) {
    this.client = new Meilisearch({
      host: process.env.MEILI_HOST ?? 'http://meili:7700',
      apiKey: process.env.MEILI_MASTER_KEY,
    });
  }

  get index(): Index<PublicationDocument> {
    return this.client.index<PublicationDocument>(INDEX);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.createIndex(INDEX, { primaryKey: 'id' });
    } catch {
      // Indeks sudah ada; lanjutkan ke pengaturan.
    }

    try {
      await this.index.updateSettings({
        searchableAttributes: ['title', 'abstract', 'authors', 'journal', 'doi'],
        filterableAttributes: [
          'year',
          'type',
          'categorySlugs',
          'indexations',
          'journal',
        ],
        sortableAttributes: ['citationCount', 'publishedAt', 'viewCount'],
        // Kata fungsi ID+EN tidak boleh memengaruhi relevansi.
        stopWords: [
          'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan',
          'dalam', 'atau', 'ini', 'itu', 'sebagai', 'terhadap', 'oleh',
          'secara', 'serta', 'antara', 'melalui', 'berbasis',
          'the', 'a', 'an', 'of', 'in', 'on', 'for', 'and', 'or', 'to',
          'with', 'by', 'at', 'from', 'as', 'is', 'are', 'be', 'this',
          'that', 'its', 'using', 'based',
        ],
        // Peneliti kerap mencari dengan istilah Indonesia untuk karya berbahasa Inggris.
        synonyms: {
          klasifikasi: ['classification'],
          classification: ['klasifikasi'],
          'pembelajaran mesin': ['machine learning'],
          'machine learning': ['pembelajaran mesin'],
          'jaringan saraf': ['neural network'],
          'neural network': ['jaringan saraf'],
          'kecerdasan buatan': ['artificial intelligence', 'ai'],
          'artificial intelligence': ['kecerdasan buatan'],
          citra: ['image'],
          image: ['citra'],
          pengelompokan: ['clustering', 'klasterisasi'],
          clustering: ['pengelompokan', 'klasterisasi'],
          klasterisasi: ['clustering', 'pengelompokan'],
          prediksi: ['prediction', 'forecasting', 'peramalan'],
          prediction: ['prediksi'],
          peramalan: ['forecasting', 'prediksi'],
          forecasting: ['peramalan'],
          optimasi: ['optimization', 'optimisasi'],
          optimization: ['optimasi'],
          'penginderaan jauh': ['remote sensing'],
          'remote sensing': ['penginderaan jauh'],
          keamanan: ['security'],
          security: ['keamanan'],
          jaringan: ['network'],
          network: ['jaringan'],
          padi: ['rice'],
          rice: ['padi'],
          banjir: ['flood'],
          flood: ['banjir'],
          pertanian: ['agriculture', 'farming'],
          agriculture: ['pertanian'],
        },
        // Judul jauh lebih menentukan relevansi daripada abstrak.
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
          'exactness',
          'citationCount:desc',
        ],
      });
    } catch (error) {
      this.logger.warn(
        `Pengaturan indeks gagal: ${(error as Error).message}. Pencarian tetap memakai basis data.`,
      );
    }
  }

  /** Menyusun dokumen indeks dari satu publikasi. */
  private async buildDocument(
    publicationId: string,
  ): Promise<PublicationDocument | null> {
    const row = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      include: {
        journal: true,
        authors: { orderBy: { authorOrder: 'asc' } },
        categories: { include: { category: true } },
        indexations: { include: { indexation: true } },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      doi: row.doi,
      title: row.title,
      abstract: row.abstract ?? '',
      authors: row.authors.map((a) => a.rawAuthorName),
      journal: row.journal?.name ?? '',
      year: row.publishedDate?.getFullYear() ?? null,
      publishedAt: row.publishedDate?.getTime() ?? 0,
      type: row.type,
      categories: row.categories.map((c) => c.category.name),
      categorySlugs: row.categories.map((c) => c.category.slug),
      indexations: row.indexations.map((i) => i.indexation.code),
      citationCount: row.citationCount,
      viewCount: row.viewCount,
    };
  }

  /** Hanya publikasi ter-approve yang boleh berada di indeks publik. */
  async sync(publicationId: string, status: string): Promise<void> {
    try {
      if (status !== 'APPROVED') {
        await this.index.deleteDocument(publicationId);
        return;
      }

      const document = await this.buildDocument(publicationId);
      if (document) await this.index.addDocuments([document]);
    } catch (error) {
      this.logger.warn(
        `Sinkronisasi indeks gagal untuk ${publicationId}: ${(error as Error).message}`,
      );
    }
  }

  async reindexAll(): Promise<{ indexed: number }> {
    const approved = await this.prisma.publication.findMany({
      where: { status: 'APPROVED' },
      select: { id: true },
    });

    const documents: PublicationDocument[] = [];
    for (const row of approved) {
      const document = await this.buildDocument(row.id);
      if (document) documents.push(document);
    }

    await this.index.deleteAllDocuments();
    if (documents.length > 0) await this.index.addDocuments(documents);

    return { indexed: documents.length };
  }
}
