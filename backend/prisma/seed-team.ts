import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Akun tim UNICAL Associates. Kata sandi WAJIB dari environment —
// akun yang kata sandinya kosong dilewati dan dilaporkan.
// Nama resmi diambil langsung dari API publik ORCID saat seed berjalan.
const TEAM: {
  email: string;
  envKey: string;
  role: 'SUPER_ADMIN' | 'FACULTY_ADMIN' | 'MEMBER';
  orcid: string | null;
  fallbackName: string;
  bio: string | null;
  issueUnicalId: boolean;
}[] = [
  {
    email: 'USRSuperAdmin@unical.assoc.id',
    envKey: 'SEED_PWD_SUPERADMIN',
    role: 'SUPER_ADMIN',
    orcid: null,
    fallbackName: 'UNICAL Super Admin',
    bio: 'Akun sistem pengelola UNICAL ASSOCIATES REPO.',
    issueUnicalId: false,
  },
  {
    // Kepala Associates — diterbitkan pertama agar memegang nomor urut awal.
    email: 'USRmuhfaisal@unical.assoc.id',
    envKey: 'SEED_PWD_MUHFAISAL',
    role: 'FACULTY_ADMIN',
    orcid: '0000-0003-1469-9468',
    fallbackName: 'Muhammad Faisal',
    bio: 'Kepala UNICAL Associates.',
    issueUnicalId: true,
  },
  {
    email: 'USRdayangaisyah@unical.assoc.id',
    envKey: 'SEED_PWD_DAYANGAISYAH',
    role: 'FACULTY_ADMIN',
    orcid: '0009-0001-9597-4697',
    fallbackName: 'Dayang Aisyah',
    bio: 'Anggota UNICAL Associates.',
    issueUnicalId: true,
  },
  {
    email: 'USRnuradnan@unical.assoc.id',
    envKey: 'SEED_PWD_NURADNAN',
    role: 'FACULTY_ADMIN',
    orcid: '0009-0002-4791-7548',
    fallbackName: 'Nur Adnan Yusri Adnan',
    bio: 'Anggota UNICAL Associates.',
    issueUnicalId: true,
  },
  {
    email: 'USRilhamakbar@unical.assoc.id',
    envKey: 'SEED_PWD_ILHAMAKBAR',
    role: 'FACULTY_ADMIN',
    orcid: '0009-0001-1591-066X',
    fallbackName: 'Muh. Ilham Akbar',
    bio: 'Anggota UNICAL Associates.',
    issueUnicalId: true,
  },
  {
    email: 'USRandimawadda@unical.assoc.id',
    envKey: 'SEED_PWD_ANDIMAWADDA',
    role: 'FACULTY_ADMIN',
    orcid: '0009-0009-5083-8227',
    fallbackName: 'Andi Mawadda Taiba',
    bio: 'Anggota UNICAL Associates.',
    issueUnicalId: true,
  },
  {
    email: 'USRashabulkahfi@unical.assoc.id',
    envKey: 'SEED_PWD_ASHABULKAHFI',
    role: 'FACULTY_ADMIN',
    orcid: '0009-0002-5980-8277',
    fallbackName: 'Ashabul Kahfi',
    bio: 'Anggota UNICAL Associates.',
    issueUnicalId: true,
  },
  {
    email: 'USRmuhalhaikal@unical.assoc.id',
    envKey: 'SEED_PWD_MUHALHAIKAL',
    role: 'FACULTY_ADMIN',
    orcid: '0009-0009-8599-8909',
    fallbackName: 'Muh Al Haikal',
    bio: 'Anggota UNICAL Associates.',
    issueUnicalId: true,
  },
  {
    email: 'USRmuhammadrizalharis@unical.assoc.id',
    envKey: 'SEED_PWD_MUHAMMADRIZALHARIS',
    role: 'FACULTY_ADMIN',
    orcid: '0009-0004-2748-8509',
    fallbackName: 'Muhammad Rizal Haris',
    bio: 'Anggota UNICAL Associates.',
    issueUnicalId: true,
  },
  {
    email: 'USRQA.Admin@unical.assoc.id',
    envKey: 'SEED_PWD_QA_ADMIN',
    role: 'FACULTY_ADMIN',
    orcid: null,
    fallbackName: 'QA Admin',
    bio: 'Akun penjaminan mutu (admin).',
    issueUnicalId: false,
  },
  {
    email: 'USRQAUser@unical.assoc.id',
    envKey: 'SEED_PWD_QA_USER',
    role: 'MEMBER',
    orcid: null,
    fallbackName: 'QA User',
    bio: 'Akun penjaminan mutu (anggota). Dibiarkan tanpa UNICAL ID agar alur verifikasi bisa diuji.',
    issueUnicalId: false,
  },
];

const ARGON = { memoryCost: 65536, timeCost: 3, parallelism: 4 };

function titleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
}

/** Nama resmi dari ORCID; huruf kapital penuh dirapikan ke Title Case. */
async function nameFromOrcid(orcid: string): Promise<string | null> {
  try {
    const response = await fetch(`https://pub.orcid.org/v3.0/${orcid}/person`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;

    const person = (await response.json()) as {
      name?: {
        'given-names'?: { value?: string };
        'family-name'?: { value?: string };
      };
    };

    const given = person.name?.['given-names']?.value ?? '';
    const family = person.name?.['family-name']?.value ?? '';
    const full = `${given} ${family}`.replace(/\s+/g, ' ').trim();
    if (!full) return null;

    return full === full.toUpperCase() ? titleCase(full) : full;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const wipe = process.env.SEED_TEAM_WIPE === 'true';
  if (wipe) {
    // Data percobaan pengembangan dibersihkan; master data dipertahankan.
    await prisma.claimRequest.deleteMany();
    await prisma.citationSnapshot.deleteMany();
    await prisma.publication.deleteMany();
    await prisma.journal.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    console.log('Data uji lama dibersihkan (publikasi, jurnal, akun).');
  }

  let created = 0;
  const skipped: string[] = [];

  for (const member of TEAM) {
    const password = process.env[member.envKey];
    if (!password) {
      skipped.push(`${member.email} (${member.envKey} kosong)`);
      continue;
    }

    const email = member.email.toLowerCase();
    const fullName = member.orcid
      ? ((await nameFromOrcid(member.orcid)) ?? member.fallbackName)
      : member.fallbackName;

    const parts = fullName.split(/\s+/);
    const firstName = parts.slice(0, -1).join(' ') || parts[0];
    const lastName = parts.length > 1 ? parts.at(-1)! : null;

    const passwordHash = await hash(password, ARGON);

    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: member.role },
      create: {
        email,
        passwordHash,
        role: member.role,
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
        profile: {
          create: {
            firstName,
            lastName,
            fullName,
            country: 'ID',
            institution: 'Universitas Muhammadiyah Makassar',
            orcid: member.orcid,
            bio: member.bio,
            affiliationCompletedAt: new Date(),
          },
        },
      },
      include: { profile: true },
    });

    // Profil bisa tertinggal saat upsert akun lama; pastikan ORCID dan bio terisi.
    await prisma.researcherProfile.update({
      where: { userId: user.id },
      data: { orcid: member.orcid, bio: member.bio, fullName, firstName, lastName },
    });

    if (member.issueUnicalId && !user.profile?.unicalId) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('unical_id_seq'))`;
        const year = new Date().getFullYear().toString().slice(-2);
        const prefix = `UNICAL-${year}`;
        const rows = await tx.$queryRaw<{ max: string | null }[]>`
          SELECT MAX(unical_id) AS max FROM researcher_profiles
          WHERE unical_id LIKE ${`${prefix}%`}
        `;
        const seq = rows[0]?.max ? Number(rows[0].max.slice(9)) + 1 : 1;
        const unicalId = `${prefix}${seq.toString().padStart(6, '0')}`;

        await tx.researcherProfile.update({
          where: { userId: user.id },
          data: { unicalId, isVerified: true },
        });
        console.log(`  ${unicalId}  ${fullName}`);
      });
    } else {
      console.log(`  ${user.profile?.unicalId ?? '(tanpa ID)'}  ${fullName} [${member.role}]`);
    }

    created++;
  }

  console.log(`\nSelesai: ${created} akun diproses.`);
  if (skipped.length) {
    console.log('Dilewati karena kata sandi belum diisi di env:');
    for (const s of skipped) console.log(`  - ${s}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
