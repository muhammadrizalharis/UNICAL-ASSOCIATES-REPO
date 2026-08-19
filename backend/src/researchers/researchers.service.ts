import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';

@Injectable()
export class ResearchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
            authors: {
              orderBy: { authorOrder: 'asc' },
              select: {
                rawAuthorName: true,
                authorOrder: true,
                researcher: { select: { unicalId: true } },
              },
            },
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
      // Daftar kontributor lengkap seperti tampilan karya di ORCID.
      contributors: a.publication.authors.map((author) => ({
        name: author.rawAuthorName,
        unicalId: author.researcher?.unicalId ?? null,
        isOwner: author.researcher?.unicalId === unicalId,
      })),
      badges: a.publication.indexations.map((i) => i.indexation),
    }));

    const publicationsByYear: Record<string, number> = {};
    for (const pub of publications) {
      if (!pub.year) continue;
      publicationsByYear[pub.year] = (publicationsByYear[pub.year] ?? 0) + 1;
    }

    // Tren sitasi: total snapshot bulanan seluruh karya peneliti ini.
    const trendRows = await this.prisma.citationSnapshot.groupBy({
      by: ['snapshotDate'],
      where: {
        publication: {
          status: 'APPROVED',
          authors: { some: { researcher: { unicalId } } },
        },
      },
      _sum: { citationCount: true },
      orderBy: { snapshotDate: 'asc' },
    });
    const citationTrend = trendRows.map((row) => ({
      date: row.snapshotDate.toISOString().slice(0, 10),
      citations: row._sum.citationCount ?? 0,
    }));

    // Kolaborator terdekat berdasarkan karya bersama.
    const collabCount = new Map<
      string,
      { name: string; unicalId: string | null; count: number }
    >();
    for (const pub of publications) {
      for (const c of pub.contributors) {
        if (c.isOwner) continue;
        const key = c.unicalId ?? c.name.toLowerCase();
        const entry = collabCount.get(key);
        if (entry) entry.count++;
        else collabCount.set(key, { name: c.name, unicalId: c.unicalId, count: 1 });
      }
    }
    const topCollaborators = [...collabCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const followerCount = await this.prisma.researcherFollow.count({
      where: { researcher: { unicalId } },
    });

    return {
      ...profile,
      followerCount,
      metrics: {
        totalPublications: publications.length,
        totalCitations: profile.totalCitations,
        hIndex: profile.hIndex,
        i10Index: profile.i10Index,
      },
      publicationsByYear,
      citationTrend,
      topCollaborators,
      publications,
    };
  }

  private async profileByUnicalId(unicalId: string) {
    const profile = await this.prisma.researcherProfile.findUnique({
      where: { unicalId },
      select: { id: true, userId: true, fullName: true },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'RESEARCHER_NOT_FOUND',
        message: 'Peneliti dengan UNICAL ID tersebut tidak ditemukan.',
      });
    }
    return profile;
  }

  async followState(userId: string, unicalId: string) {
    const profile = await this.profileByUnicalId(unicalId);
    const follow = await this.prisma.researcherFollow.findUnique({
      where: {
        followerId_researcherId: {
          followerId: userId,
          researcherId: profile.id,
        },
      },
      select: { createdAt: true },
    });
    return { following: Boolean(follow), isSelf: profile.userId === userId };
  }

  async follow(userId: string, unicalId: string) {
    const profile = await this.profileByUnicalId(unicalId);
    if (profile.userId === userId) {
      return { following: false, isSelf: true };
    }

    const created = await this.prisma.researcherFollow.upsert({
      where: {
        followerId_researcherId: {
          followerId: userId,
          researcherId: profile.id,
        },
      },
      create: { followerId: userId, researcherId: profile.id },
      update: {},
    });

    // Notifikasi hanya saat follow baru, bukan pengulangan.
    if (Date.now() - created.createdAt.getTime() < 5_000) {
      const follower = await this.prisma.researcherProfile.findUnique({
        where: { userId },
        select: { fullName: true, unicalId: true },
      });
      void this.notifications.notify(profile.userId, {
        type: 'social.follow',
        title: `${follower?.fullName ?? 'Seseorang'} mulai mengikuti Anda`,
        link: follower?.unicalId ? `/profil/${follower.unicalId}` : undefined,
      });
    }

    return { following: true, isSelf: false };
  }

  async unfollow(userId: string, unicalId: string) {
    const profile = await this.profileByUnicalId(unicalId);
    await this.prisma.researcherFollow.deleteMany({
      where: { followerId: userId, researcherId: profile.id },
    });
    return { following: false, isSelf: profile.userId === userId };
  }

  /** Semua userId pengikut seorang peneliti; dipakai untuk notifikasi karya baru. */
  async followerUserIds(researcherIds: string[]): Promise<string[]> {
    if (researcherIds.length === 0) return [];
    const rows = await this.prisma.researcherFollow.findMany({
      where: { researcherId: { in: researcherIds } },
      select: { followerId: true },
    });
    return rows.map((r) => r.followerId);
  }
}
