import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ResearchersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Direktori hanya memuat peneliti yang UNICAL ID-nya sudah terbit. */
  async directory(params: { q?: string; facultyId?: string; page?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;

    const where = {
      unicalId: { not: null },
      ...(params.facultyId ? { facultyId: params.facultyId } : {}),
      ...(params.q
        ? { fullName: { contains: params.q, mode: 'insensitive' as const } }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.researcherProfile.count({ where }),
      this.prisma.researcherProfile.findMany({
        where,
        orderBy: [{ totalCitations: 'desc' }, { fullName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          unicalId: true,
          fullName: true,
          photoUrl: true,
          hIndex: true,
          totalCitations: true,
          faculty: { select: { name: true } },
          department: { select: { name: true } },
          _count: { select: { authorships: true } },
        },
      }),
    ]);

    return {
      data: rows,
      meta: { page, perPage: limit, total, lastPage: Math.ceil(total / limit) || 1 },
    };
  }

  async publicProfile(unicalId: string) {
    const profile = await this.prisma.researcherProfile.findUnique({
      where: { unicalId },
      select: {
        unicalId: true,
        fullName: true,
        photoUrl: true,
        bio: true,
        institution: true,
        country: true,
        expertise: true,
        orcid: true,
        scopusId: true,
        sintaId: true,
        scholarId: true,
        hIndex: true,
        i10Index: true,
        totalCitations: true,
        faculty: { select: { name: true } },
        department: { select: { name: true, degree: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException({
        code: 'RESEARCHER_NOT_FOUND',
        message: 'Peneliti dengan UNICAL ID tersebut tidak ditemukan.',
      });
    }

    const authorships = await this.prisma.publicationAuthor.findMany({
      where: {
        researcher: { unicalId },
        publication: { status: 'APPROVED' },
      },
      orderBy: { publication: { publishedDate: 'desc' } },
      select: {
        authorOrder: true,
        isCorresponding: true,
        publication: {
          select: {
            id: true,
            title: true,
            publishedDate: true,
            citationCount: true,
            journal: { select: { name: true } },
            indexations: {
              select: {
                indexation: {
                  select: { code: true, name: true, level: true, badgeColor: true },
                },
              },
            },
          },
        },
      },
    });

    const publications = authorships.map((a) => ({
      id: a.publication.id,
      title: a.publication.title,
      journal: a.publication.journal?.name ?? null,
      year: a.publication.publishedDate?.getFullYear() ?? null,
      citationCount: a.publication.citationCount,
      authorOrder: a.authorOrder,
      isCorresponding: a.isCorresponding,
      badges: a.publication.indexations.map((i) => i.indexation),
    }));

    const publicationsByYear: Record<string, number> = {};
    for (const pub of publications) {
      if (!pub.year) continue;
      publicationsByYear[pub.year] = (publicationsByYear[pub.year] ?? 0) + 1;
    }

    return {
      ...profile,
      metrics: {
        totalPublications: publications.length,
        totalCitations: profile.totalCitations,
        hIndex: profile.hIndex,
        i10Index: profile.i10Index,
      },
      publicationsByYear,
      publications,
    };
  }
}
