import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UnicalIdService } from '../auth/unical-id.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly unicalId: UnicalIdService,
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
      select: { id: true, status: true },
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

    return updated;
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
