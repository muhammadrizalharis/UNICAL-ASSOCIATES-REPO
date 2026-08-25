import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.module';
import { DoiResolverService } from '../doi/doi-resolver.service';
import { normalizeDoi } from '../doi/doi.util';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { ResolvedPublication } from '../doi/doi.types';

@Injectable()
export class PublicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: DoiResolverService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, dto: CreatePublicationDto) {
    const doi = normalizeDoi(dto.doi);
    if (!doi) {
      throw new BadRequestException({
        code: 'DOI_INVALID',
        message: 'Format DOI tidak valid.',
      });
    }

    const duplicate = await this.prisma.publication.findUnique({
      where: { doi },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException({
        code: 'DOI_ALREADY_EXISTS',
        message: 'Artikel dengan DOI ini sudah terdaftar.',
        details: { publicationId: duplicate.id, canClaimAuthorship: true },
      });
    }

    // Metadata diambil ulang di server; klien tidak boleh menentukan isinya.
    const meta = await this.resolver.resolve(doi);

    const profile = await this.prisma.researcherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const journalId = await this.findOrCreateJournal(meta);

    const indexations = dto.indexationCodes?.length
      ? await this.prisma.indexation.findMany({
          where: { code: { in: dto.indexationCodes } },
          select: { id: true },
        })
      : [];

    const publication = await this.prisma.publication.create({
      data: {
        doi,
        title: meta.title,
        abstract: dto.abstractOverride?.trim() || meta.abstract,
        type: meta.type,
        journalId,
        volume: meta.volume,
        issue: meta.issue,
        pages: meta.pages,
        publishedDate: meta.publishedDate ? new Date(meta.publishedDate) : null,
        keywords: meta.keywords,
        url: meta.url,
        citationCount: meta.citationCount,
        submittedById: userId,
        metadataRaw: meta.raw as object,
        authors: {
          create: meta.authors.map((author) => ({
            rawAuthorName: author.name,
            authorOrder: author.order,
            isCorresponding: author.isCorresponding,
            affiliationRaw: author.affiliation,
            // Slot penulis langsung tertaut bila pengunggah mengklaimnya.
            researcherId:
              profile && dto.claimAuthorOrder === author.order
                ? profile.id
                : null,
          })),
        },
        categories: dto.categoryIds?.length
          ? {
              create: dto.categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
        indexations: indexations.length
          ? {
              create: indexations.map((i) => ({ indexationId: i.id })),
            }
          : undefined,
      },
      include: this.detailInclude(),
    });

    return this.toDetail(publication);
  }

  async findMany(params: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));

    const where = {
      status:
        (params.status as 'PENDING' | 'APPROVED' | 'REJECTED') ?? 'APPROVED',
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q, mode: 'insensitive' as const } },
              {
                abstract: { contains: params.q, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.publication.count({ where }),
      this.prisma.publication.findMany({
        where,
        orderBy: [{ publishedDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: this.detailInclude(),
      }),
    ]);

    return {
      data: rows.map((row) => this.toDetail(row)),
      meta: {
        page,
        perPage: limit,
        total,
        lastPage: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { id },
      include: this.detailInclude(),
    });

    if (!publication) {
      throw new NotFoundException({
        code: 'PUBLICATION_NOT_FOUND',
        message: 'Publikasi tidak ditemukan.',
      });
    }

    await this.prisma.publication.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return this.toDetail(publication);
  }

  private async findOrCreateJournal(
    meta: ResolvedPublication,
  ): Promise<string | null> {
    if (!meta.journal.name) return null;

    if (meta.journal.issn) {
      const existing = await this.prisma.journal.findUnique({
        where: { issn: meta.journal.issn },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const byName = await this.prisma.journal.findFirst({
      where: { name: meta.journal.name },
      select: { id: true },
    });
    if (byName) return byName.id;

    const created = await this.prisma.journal.create({
      data: {
        name: meta.journal.name,
        publisher: meta.journal.publisher,
        issn: meta.journal.issn,
        eissn: meta.journal.eissn,
      },
      select: { id: true },
    });

    return created.id;
  }

  /** Simpan PDF open-access; hanya pengunggah publikasi atau pengelola. */
  async attachPdf(userId: string, publicationId: string, buffer: Buffer) {
    if (!buffer.subarray(0, 5).toString('latin1').startsWith('%PDF-')) {
      throw new BadRequestException({
        code: 'NOT_A_PDF',
        message: 'Isi berkas bukan PDF yang valid.',
      });
    }

    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      select: { id: true, submittedById: true },
    });
    if (!publication) {
      throw new NotFoundException({
        code: 'PUBLICATION_NOT_FOUND',
        message: 'Publikasi tidak ditemukan.',
      });
    }

    if (publication.submittedById !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      const allowed = ['MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN'];
      if (!user || !allowed.includes(user.role)) {
        throw new ForbiddenException({
          code: 'PDF_FORBIDDEN',
          message:
            'Hanya pengunggah publikasi atau pengelola yang boleh melampirkan PDF.',
        });
      }
    }

    await this.storage.put(
      `pdf/${publicationId}.pdf`,
      buffer,
      'application/pdf',
    );
    await this.prisma.publication.update({
      where: { id: publicationId },
      data: { pdfUrl: `/api/v1/publications/${publicationId}/pdf` },
    });

    return { pdfUrl: `/api/v1/publications/${publicationId}/pdf` };
  }

  async getPdf(publicationId: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      select: { pdfUrl: true, doi: true },
    });
    if (!publication?.pdfUrl) {
      throw new NotFoundException({
        code: 'PDF_NOT_FOUND',
        message: 'Publikasi ini belum memiliki PDF open-access.',
      });
    }

    const object = await this.storage.stream(`pdf/${publicationId}.pdf`);
    if (!object) {
      throw new NotFoundException({
        code: 'PDF_NOT_FOUND',
        message: 'Berkas PDF tidak ditemukan di penyimpanan.',
      });
    }

    return {
      ...object,
      filename: `${publication.doi.replace(/[^\w.-]+/g, '_')}.pdf`,
    };
  }

  private detailInclude() {
    return {
      journal: true,
      authors: { orderBy: { authorOrder: 'asc' as const } },
      categories: { include: { category: true } },
      indexations: { include: { indexation: true } },
    };
  }

  private toDetail(row: Record<string, any>) {
    return {
      id: row.id,
      doi: row.doi,
      title: row.title,
      abstract: row.abstract,
      type: row.type,
      status: row.status,
      journal: row.journal
        ? {
            name: row.journal.name,
            publisher: row.journal.publisher,
            issn: row.journal.issn,
            scopusQuartile: row.journal.scopusQuartile,
            sintaLevel: row.journal.sintaLevel,
          }
        : null,
      authors: row.authors.map((a: Record<string, any>) => ({
        name: a.rawAuthorName,
        order: a.authorOrder,
        isCorresponding: a.isCorresponding,
        affiliation: a.affiliationRaw,
        claimed: Boolean(a.researcherId),
      })),
      categories: row.categories.map((c: Record<string, any>) => ({
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
      })),
      badges: row.indexations.map((i: Record<string, any>) => ({
        code: i.indexation.code,
        name: i.indexation.name,
        level: i.indexation.level,
        color: i.indexation.badgeColor,
      })),
      volume: row.volume,
      issue: row.issue,
      pages: row.pages,
      publishedDate: row.publishedDate,
      keywords: row.keywords,
      url: row.url,
      pdfUrl: row.pdfUrl,
      citationCount: row.citationCount,
      viewCount: row.viewCount,
    };
  }
}
