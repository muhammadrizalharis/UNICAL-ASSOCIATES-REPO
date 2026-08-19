import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UnicalIdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Menerbitkan UNICAL-YYNNNNNN. Advisory lock tingkat transaksi dipakai agar
   * dua registrasi bersamaan tidak pernah memperoleh nomor urut yang sama.
   */
  async issue(profileId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('unical_id_seq'))`;

      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = `UNICAL-${year}`;

      const rows = await tx.$queryRaw<{ max: string | null }[]>`
        SELECT MAX(unical_id) AS max
        FROM researcher_profiles
        WHERE unical_id LIKE ${`${prefix}%`}
      `;

      const last = rows[0]?.max;
      const sequence = last ? Number(last.slice(9)) + 1 : 1;
      const unicalId = `${prefix}${sequence.toString().padStart(6, '0')}`;

      await tx.researcherProfile.update({
        where: { id: profileId },
        data: { unicalId, isVerified: true },
      });

      return unicalId;
    });
  }
}
