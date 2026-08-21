import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UnicalIdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Menerbitkan UNICAL-YYNNNNNN. Nomor urut disimpan pada tabel penghitung
   * permanen sehingga ID akun yang sudah dihapus tidak pernah didaur ulang;
   * advisory lock menjaga dua registrasi bersamaan tetap unik.
   */
  async issue(profileId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('unical_id_seq'))`;

      const year = new Date().getFullYear().toString().slice(-2);
      const prefix = `UNICAL-${year}`;

      const counter = await tx.unicalIdCounter.findUnique({
        where: { year },
      });

      let sequence: number;
      if (counter) {
        sequence = counter.lastSeq + 1;
        await tx.unicalIdCounter.update({
          where: { year },
          data: { lastSeq: sequence },
        });
      } else {
        // Tahun baru atau instalasi lama: mulai dari nomor tertinggi yang
        // pernah ada agar tidak menabrak ID yang sudah terbit.
        const rows = await tx.$queryRaw<{ max: string | null }[]>`
          SELECT MAX(unical_id) AS max
          FROM researcher_profiles
          WHERE unical_id LIKE ${`${prefix}%`}
        `;
        const last = rows[0]?.max;
        sequence = last ? Number(last.slice(9)) + 1 : 1;
        await tx.unicalIdCounter.create({
          data: { year, lastSeq: sequence },
        });
      }

      const unicalId = `${prefix}${sequence.toString().padStart(6, '0')}`;

      await tx.researcherProfile.update({
        where: { id: profileId },
        data: { unicalId, isVerified: true },
      });

      return unicalId;
    });
  }
}
