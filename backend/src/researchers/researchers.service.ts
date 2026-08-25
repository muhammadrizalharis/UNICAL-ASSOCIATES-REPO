import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CacheService } from '../common/cache/cache.module';
import { NotificationsService } from '../notifications/notifications.module';
import { StorageService } from '../common/storage/storage.module';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PROFILE_CACHE_TTL_S = 120;
const DIRECTORY_CACHE_TTL_S = 60;
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

/** Deteksi tipe gambar dari magic bytes; menolak berkas selain JPG/PNG/WebP. */
function detectImageType(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return 'image/jpeg';
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png';
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return 'image/webp';
  return null;
}

@Injectable()
export class ResearchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /** Simpan foto profil (JPG/PNG/WebP, maks 3 MB) untuk akun mana pun. */
  async setAvatar(userId: string, buffer: Buffer) {
    const contentType = detectImageType(buffer);
    if (!contentType) {
      throw new BadRequestException({
        code: 'NOT_AN_IMAGE',
        message: 'Berkas harus berupa gambar JPG, PNG, atau WebP.',
      });
    }
    if (buffer.length > MAX_AVATAR_BYTES) {
      throw new BadRequestException({
        code: 'IMAGE_TOO_LARGE',
        message: 'Ukuran gambar maksimal 3 MB.',
      });
    }

    const profile = await this.prisma.researcherProfile.findUnique({
      where: { userId },
      select: { id: true, unicalId: true },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Profil tidak ditemukan.',
      });
    }

    await this.storage.put(`avatar/${profile.id}`, buffer, contentType);
    // Query versi memaksa peramban memuat ulang gambar setelah diganti.
    const photoUrl = `/api/v1/researchers/avatar/${profile.id}?v=${Date.now()}`;
    await this.prisma.researcherProfile.update({
      where: { id: profile.id },
      data: { photoUrl },
    });
    if (profile.unicalId) await this.cache.del(`profile:${profile.unicalId}`);

    return { photoUrl };
  }

  /** Ambil objek foto profil dari MinIO untuk di-stream ke peramban. */
  async getAvatar(profileId: string) {
    const object = await this.storage.stream(`avatar/${profileId}`);
    if (!object) {
      throw new NotFoundException({
        code: 'AVATAR_NOT_FOUND',
        message: 'Foto profil tidak ditemukan.',
      });
    }
    return object;
  }

  /** Hapus foto profil (objek MinIO + tautannya). */
  async removeAvatar(userId: string) {
    const profile = await this.prisma.researcherProfile.findUnique({
      where: { userId },
      select: { id: true, unicalId: true, photoUrl: true },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Profil tidak ditemukan.',
      });
    }
    if (profile.photoUrl) {
      await this.storage.remove(`avatar/${profile.id}`);
      await this.prisma.researcherProfile.update({
        where: { id: profile.id },
        data: { photoUrl: null },
      });
      if (profile.unicalId) await this.cache.del(`profile:${profile.unicalId}`);
    }
    return { photoUrl: null };
  }

  /** Pembaruan profil mandiri: nama, bio, keahlian, dan afiliasi. */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const current = await this.prisma.researcherProfile.findUnique({
      where: { userId },
      select: { id: true, unicalId: true, firstName: true, lastName: true },
    });
    if (!current) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Profil tidak ditemukan.',
      });
    }

    // Program studi menentukan fakultasnya; tolak pasangan yang tidak konsisten.
    let facultyId = dto.facultyId;
    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
        select: { facultyId: true },
      });
      if (!department) {
        throw new BadRequestException({
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'Program studi tidak ditemukan.',
        });
      }
      if (dto.facultyId && department.facultyId !== dto.facultyId) {
        throw new BadRequestException({
          code: 'DEPARTMENT_FACULTY_MISMATCH',
          message: 'Program studi tidak berada di bawah fakultas yang dipilih.',
        });
      }
      facultyId = department.facultyId;
    }

    const firstName = dto.firstName?.trim() || current.firstName;
    const lastName =
      dto.lastName === undefined
        ? current.lastName
        : dto.lastName.trim() || null;
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const profile = await this.prisma.researcherProfile.update({
      where: { id: current.id },
      data: {
        firstName,
        lastName,
        fullName,
        bio: dto.bio === undefined ? undefined : dto.bio.trim() || null,
        expertise:
          dto.expertise === undefined
            ? undefined
            : dto.expertise.map((e) => e.trim()).filter(Boolean),
        institution:
          dto.institution === undefined
            ? undefined
            : dto.institution.trim() || null,
        ...(dto.departmentId !== undefined || dto.facultyId !== undefined
          ? {
              facultyId: facultyId ?? null,
              departmentId: dto.departmentId ?? null,
            }
          : {}),
        ...(dto.facultyOther !== undefined
          ? { facultyOther: dto.facultyOther.trim() || null }
          : {}),
        ...(dto.departmentOther !== undefined
          ? { departmentOther: dto.departmentOther.trim() || null }
          : {}),
      },
      include: { faculty: true, department: true },
    });

    if (current.unicalId) await this.cache.del(`profile:${current.unicalId}`);
    return { profile };
  }

  /** Direktori hanya memuat peneliti yang UNICAL ID-nya sudah terbit. */
  async directory(params: { q?: string; facultyId?: string; page?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = 20;

    const cacheKey = `directory:${params.q ?? ''}:${params.facultyId ?? ''}:${page}`;
    const cached = await this.cache.get<object>(cacheKey);
    if (cached) return cached;

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
        // Peringkat: jumlah karya dulu, lalu sitasi, lalu nama.
        orderBy: [
          { authorships: { _count: 'desc' } },
          { totalCitations: 'desc' },
          { fullName: 'asc' },
        ],
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

    const result = {
      data: rows,
      meta: {
        page,
        perPage: limit,
        total,
        lastPage: Math.ceil(total / limit) || 1,
      },
    };
    await this.cache.set(cacheKey, result, DIRECTORY_CACHE_TTL_S);
    return result;
  }

  async publicProfile(unicalId: string) {
    const cacheKey = `profile:${unicalId}`;
    const cached = await this.cache.get<object>(cacheKey);
    if (cached) return cached;

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
                  select: {
                    code: true,
                    name: true,
                    level: true,
                    badgeColor: true,
                  },
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
        else
          collabCount.set(key, {
            name: c.name,
            unicalId: c.unicalId,
            count: 1,
          });
      }
    }
    const topCollaborators = [...collabCount.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const followerCount = await this.prisma.researcherFollow.count({
      where: { researcher: { unicalId } },
    });

    const result = {
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

    await this.cache.set(cacheKey, result, PROFILE_CACHE_TTL_S);
    return result;
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
