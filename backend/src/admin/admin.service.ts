import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { UnicalIdService } from '../auth/unical-id.service';
import { MetricsService } from '../researchers/metrics.service';
import { ResearchersService } from '../researchers/researchers.service';
import { SearchIndexService } from '../search/search-index.service';
import { MailService } from '../common/mail/mail.service';
import { NotificationsService } from '../notifications/notifications.module';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unicalId: UnicalIdService,
    private readonly metrics: MetricsService,
    private readonly researchers: ResearchersService,
    private readonly searchIndex: SearchIndexService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async pendingPublications(page = 1, limit = 20) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.publication.count({ where: { status: 'PENDING' } }),
      this.prisma.publication.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          doi: true,
          title: true,
          createdAt: true,
          submittedBy: { select: { email: true } },
        },
      }),
    ]);

    return { data: rows, meta: { page, perPage: limit, total } };
  }

  async decidePublication(
    moderatorId: string,
    publicationId: string,
    approve: boolean,
    reason?: string,
  ) {
    const publication = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      select: {
        id: true,
        status: true,
        submittedById: true,
        authors: { select: { researcherId: true } },
      },
    });

    if (!publication) {
      throw new NotFoundException({
        code: 'PUBLICATION_NOT_FOUND',
        message: 'Publikasi tidak ditemukan.',
      });
    }

    if (!approve && !reason?.trim()) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'Alasan penolakan wajib diisi.',
      });
    }

    const updated = await this.prisma.publication.update({
      where: { id: publicationId },
      data: { status: approve ? 'APPROVED' : 'REJECTED' },
      select: { id: true, title: true, status: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: moderatorId,
        action: approve ? 'publication.approve' : 'publication.reject',
        targetType: 'publication',
        targetId: publicationId,
        oldValues: { status: publication.status },
        newValues: { status: updated.status, reason: reason ?? null },
      },
    });

    // Status publikasi ikut menentukan metrik, jadi dihitung ulang di sini.
    await this.metrics.recalculateForPublication(publicationId);
    // Indeks publik hanya memuat publikasi ter-approve.
    await this.searchIndex.sync(publicationId, updated.status);

    const link = `/publikasi/${publicationId}`;
    void this.notifications.notify(publication.submittedById, {
      type: approve ? 'publication.approved' : 'publication.rejected',
      title: approve
        ? `Publikasi "${updated.title.slice(0, 80)}" disetujui`
        : `Publikasi "${updated.title.slice(0, 80)}" ditolak`,
      body: approve ? undefined : reason,
      link,
    });

    if (approve) {
      // Pengikut penulis mendapat kabar karya baru.
      const researcherIds = publication.authors
        .map((a) => a.researcherId)
        .filter((id): id is string => Boolean(id));
      const followerIds = await this.researchers.followerUserIds(researcherIds);
      void this.notifications.notifyMany(
        followerIds.filter((id) => id !== publication.submittedById),
        {
          type: 'social.new_publication',
          title: `Publikasi baru: ${updated.title.slice(0, 100)}`,
          link,
        },
      );
    }

    return updated;
  }

  /**
   * Menghitung ulang metrik seluruh peneliti. Diperlukan untuk data yang
   * disetujui sebelum fitur metrik ada, atau setelah pembaruan sitasi massal.
   */
  async recalculateAllMetrics() {
    const profiles = await this.prisma.researcherProfile.findMany({
      where: { unicalId: { not: null } },
      select: { id: true, unicalId: true, fullName: true },
    });

    const results: {
      unicalId: string | null;
      fullName: string;
      hIndex: number;
      i10Index: number;
      totalCitations: number;
      totalPublications: number;
    }[] = [];

    for (const profile of profiles) {
      const metrics = await this.metrics.recalculate(profile.id);
      results.push({
        unicalId: profile.unicalId,
        fullName: profile.fullName,
        ...metrics,
      });
    }

    return { processed: results.length, results };
  }

  async reindexSearch() {
    return this.searchIndex.reindexAll();
  }

  /** Daftar semua akun untuk manajemen pengguna super admin. */
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            unicalId: true,
            orcid: true,
            _count: { select: { authorships: true } },
          },
        },
        _count: { select: { submittedPublications: true } },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      fullName: u.profile?.fullName ?? '-',
      unicalId: u.profile?.unicalId ?? null,
      orcid: u.profile?.orcid ?? null,
      authorships: u.profile?._count.authorships ?? 0,
      submitted: u._count.submittedPublications,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Hapus akun (khusus super admin). Publikasi yang diunggahnya dialihkan
   * ke super admin agar katalog tetap utuh; slot penulis duplikat hasil
   * impor ORCID akun itu ikut dibersihkan bila slot aslinya sudah tertaut
   * ke akun lain pada publikasi yang sama.
   */
  async deleteUser(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new BadRequestException({
        code: 'CANNOT_DELETE_SELF',
        message: 'Anda tidak dapat menghapus akun sendiri.',
      });
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
        profile: {
          select: { id: true, fullName: true, unicalId: true, orcid: true },
        },
      },
    });
    if (!target) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Akun tidak ditemukan.',
      });
    }
    if (target.role === 'SUPER_ADMIN') {
      throw new BadRequestException({
        code: 'CANNOT_DELETE_SUPER_ADMIN',
        message: 'Akun super admin tidak dapat dihapus.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      if (target.profile) {
        // Slot yang publikasinya sudah punya slot lain milik peneliti lain
        // dengan nama serupa = duplikat tambahan impor ORCID → hapus.
        await tx.$executeRaw`
          DELETE FROM publication_authors pa
          USING publication_authors asli
          WHERE pa.researcher_id = ${target.profile.id}::uuid
            AND asli.publication_id = pa.publication_id
            AND asli.id <> pa.id
            AND asli.researcher_id IS NOT NULL
            AND asli.researcher_id <> pa.researcher_id
            AND lower(asli.raw_author_name) = lower(pa.raw_author_name)`;
      }

      // Unggahan dialihkan agar katalog publik tidak kehilangan publikasi.
      await tx.publication.updateMany({
        where: { submittedById: target.id },
        data: { submittedById: adminId },
      });

      await tx.user.delete({ where: { id: target.id } });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'user.delete',
          targetType: 'user',
          targetId: target.id,
          oldValues: {
            email: target.email,
            role: target.role,
            fullName: target.profile?.fullName ?? null,
            unicalId: target.profile?.unicalId ?? null,
            orcid: target.profile?.orcid ?? null,
          },
        },
      });
    });

    return { deleted: true, email: target.email };
  }

  /**
   * Super admin menerbitkan tautan reset kata sandi untuk sebuah akun.
   * Token acak berumur 1 jam; hanya hash-nya yang disimpan. Bila SMTP
   * terkonfigurasi tautan dikirim ke email akun; tautan juga dikembalikan
   * ke super admin untuk disampaikan manual bila email belum berjalan.
   */
  async issuePasswordReset(adminId: string, targetUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true },
    });
    if (!target) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Akun tidak ditemukan.',
      });
    }

    // Token lama yang belum terpakai digugurkan agar hanya satu yang sah.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: target.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: { userId: target.id, tokenHash, expiresAt, createdBy: adminId },
    });

    const base = process.env.APP_URL ?? 'http://127.0.0.1:48080';
    const resetUrl = `${base}/reset-sandi?token=${token}`;
    const emailSent = await this.mail.sendPasswordReset(target.email, resetUrl);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.password_reset_issued',
        targetType: 'user',
        targetId: target.id,
        newValues: { emailSent, expiresAt },
      },
    });

    return { email: target.email, resetUrl, emailSent, expiresAt };
  }

  async pendingUsers() {
    return this.prisma.researcherProfile.findMany({
      where: { unicalId: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fullName: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
        faculty: { select: { name: true } },
        department: { select: { name: true } },
      },
    });
  }

  /** Menyetujui peneliti sekaligus menerbitkan UNICAL ID permanen. */
  async verifyResearcher(adminId: string, profileId: string) {
    const profile = await this.prisma.researcherProfile.findUnique({
      where: { id: profileId },
      select: { id: true, unicalId: true, fullName: true },
    });

    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Profil peneliti tidak ditemukan.',
      });
    }

    if (profile.unicalId) {
      throw new BadRequestException({
        code: 'UNICAL_ID_ALREADY_ISSUED',
        message: `Peneliti ini sudah memiliki ${profile.unicalId}.`,
      });
    }

    const unicalId = await this.unicalId.issue(profileId);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'user.verify',
        targetType: 'researcher_profile',
        targetId: profileId,
        newValues: { unicalId },
      },
    });

    return { profileId, fullName: profile.fullName, unicalId };
  }
}
