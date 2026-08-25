import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MetricsService } from '../researchers/metrics.service';
import { NotificationsService } from '../notifications/notifications.module';

const MAX_REJECTIONS = 3;

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Peneliti mengklaim salah satu slot penulis pada publikasi. */
  async submit(userId: string, publicationId: string, authorOrder: number) {
    const profile = await this.prisma.researcherProfile.findUnique({
      where: { userId },
      select: { id: true, unicalId: true },
    });

    if (!profile?.unicalId) {
      throw new BadRequestException({
        code: 'UNICAL_ID_REQUIRED',
        message:
          'Klaim kepenulisan membutuhkan UNICAL ID. Tunggu verifikasi admin fakultas.',
      });
    }

    const slot = await this.prisma.publicationAuthor.findUnique({
      where: {
        publicationId_authorOrder: { publicationId, authorOrder },
      },
      select: {
        id: true,
        rawAuthorName: true,
        researcherId: true,
        publication: { select: { status: true, title: true } },
      },
    });

    if (!slot || slot.publication.status !== 'APPROVED') {
      throw new NotFoundException({
        code: 'AUTHOR_SLOT_NOT_FOUND',
        message: 'Slot penulis tidak ditemukan pada publikasi terverifikasi.',
      });
    }

    if (slot.researcherId) {
      throw new ConflictException({
        code: 'SLOT_ALREADY_CLAIMED',
        message: 'Slot penulis ini sudah tertaut ke peneliti lain.',
      });
    }

    const previous = await this.prisma.claimRequest.findMany({
      where: { publicationAuthorId: slot.id, researcherId: profile.id },
      select: { status: true },
    });

    if (previous.some((c) => c.status === 'PENDING')) {
      throw new ConflictException({
        code: 'CLAIM_ALREADY_PENDING',
        message: 'Klaim Anda untuk slot ini masih menunggu peninjauan.',
      });
    }

    // Anti-penyalahgunaan: tiga penolakan memblokir klaim ulang slot yang sama.
    const rejections = previous.filter((c) => c.status === 'REJECTED').length;
    if (rejections >= MAX_REJECTIONS) {
      throw new ConflictException({
        code: 'CLAIM_BLOCKED',
        message: `Klaim untuk slot ini sudah ditolak ${MAX_REJECTIONS} kali dan tidak dapat diajukan lagi.`,
      });
    }

    const claim = await this.prisma.claimRequest.create({
      data: { publicationAuthorId: slot.id, researcherId: profile.id },
      select: { id: true, status: true, createdAt: true },
    });

    return {
      ...claim,
      publicationTitle: slot.publication.title,
      authorName: slot.rawAuthorName,
    };
  }

  async pending(page = 1, limit = 20) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.claimRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.claimRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          createdAt: true,
          researcher: {
            select: { unicalId: true, fullName: true },
          },
          publicationAuthor: {
            select: {
              rawAuthorName: true,
              authorOrder: true,
              publication: { select: { id: true, title: true, doi: true } },
            },
          },
        },
      }),
    ]);

    return { data: rows, meta: { page, perPage: limit, total } };
  }

  async decide(
    reviewerId: string,
    claimId: string,
    approve: boolean,
    reason?: string,
  ) {
    const claim = await this.prisma.claimRequest.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        status: true,
        researcherId: true,
        publicationAuthorId: true,
        researcher: { select: { userId: true } },
        publicationAuthor: {
          select: {
            researcherId: true,
            publication: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!claim || claim.status !== 'PENDING') {
      throw new NotFoundException({
        code: 'CLAIM_NOT_FOUND',
        message: 'Klaim tidak ditemukan atau sudah ditinjau.',
      });
    }

    if (!approve && !reason?.trim()) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'Alasan penolakan wajib diisi.',
      });
    }

    if (approve && claim.publicationAuthor.researcherId) {
      throw new ConflictException({
        code: 'SLOT_ALREADY_CLAIMED',
        message:
          'Slot sudah tertaut ke peneliti lain; klaim tidak bisa disetujui.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.claimRequest.update({
        where: { id: claimId },
        data: {
          status: approve ? 'APPROVED' : 'REJECTED',
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          rejectionReason: approve ? null : reason,
        },
        select: { id: true, status: true },
      });

      if (approve) {
        await tx.publicationAuthor.update({
          where: { id: claim.publicationAuthorId },
          data: { researcherId: claim.researcherId },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: approve ? 'claim.approve' : 'claim.reject',
          targetType: 'claim_request',
          targetId: claimId,
          newValues: { reason: reason ?? null },
        },
      });

      return result;
    });

    // Metrik pemohon berubah begitu slot tertaut.
    if (approve) await this.metrics.recalculate(claim.researcherId);

    const title = claim.publicationAuthor.publication.title.slice(0, 80);
    void this.notifications.notify(claim.researcher.userId, {
      type: approve ? 'claim.approved' : 'claim.rejected',
      title: approve
        ? `Klaim kepenulisan "${title}" disetujui`
        : `Klaim kepenulisan "${title}" ditolak`,
      body: approve ? undefined : reason,
      link: `/publikasi/${claim.publicationAuthor.publication.id}`,
    });

    return updated;
  }
}
