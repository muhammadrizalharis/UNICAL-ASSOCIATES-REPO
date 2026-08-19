import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Sumber: menu resmi www.unismuh.ac.id (9 fakultas) dan arsip program studi.
// Pemetaan prodi ke fakultas dapat disunting admin lewat panel bila ada koreksi.
const FACULTIES: {
  code: string;
  name: string;
  website: string;
  order: number;
  departments: { name: string; degree?: string }[];
}[] = [
  {
    code: 'fai',
    name: 'Fakultas Agama Islam',
    website: 'https://fai.unismuh.ac.id',
    order: 1,
    departments: [
      { name: 'Pendidikan Agama Islam', degree: 'S1' },
      { name: 'Pendidikan Bahasa Arab', degree: 'S1' },
      { name: 'Hukum Keluarga (Ahwal al-Syakhshiyah)', degree: 'S1' },
      { name: 'Hukum Ekonomi Syariah (Muamalah)', degree: 'S1' },
      { name: 'Komunikasi dan Penyiaran Islam', degree: 'S1' },
      { name: 'Bimbingan dan Konseling Pendidikan Islam', degree: 'S1' },
      { name: 'Ilmu Syariah', degree: 'S1' },
    ],
  },
  {
    code: 'feb',
    name: 'Fakultas Ekonomi dan Bisnis',
    website: 'https://feb.unismuh.ac.id',
    order: 2,
    departments: [
      { name: 'Manajemen', degree: 'S1' },
      { name: 'Akuntansi', degree: 'S1' },
      { name: 'Ekonomi Pembangunan', degree: 'S1' },
      { name: 'Ekonomi Islam', degree: 'S1' },
      { name: 'Perpajakan', degree: 'D3' },
    ],
  },
  {
    code: 'teknik',
    name: 'Fakultas Teknik',
    website: 'https://teknik.unismuh.ac.id',
    order: 3,
    departments: [
      { name: 'Informatika', degree: 'S1' },
      { name: 'Teknik Elektro', degree: 'S1' },
      { name: 'Arsitektur', degree: 'S1' },
      { name: 'Teknik Pengairan', degree: 'S1' },
      { name: 'Perencanaan Wilayah dan Kota', degree: 'S1' },
      { name: 'Teknik Sumber Daya Air', degree: 'S2' },
    ],
  },
  {
    code: 'fisip',
    name: 'Fakultas Ilmu Sosial dan Ilmu Politik',
    website: 'https://fisip.unismuh.ac.id',
    order: 4,
    departments: [
      { name: 'Ilmu Administrasi Negara', degree: 'S1' },
      { name: 'Ilmu Pemerintahan', degree: 'S1' },
      { name: 'Ilmu Komunikasi', degree: 'S1' },
    ],
  },
  {
    code: 'med',
    name: 'Fakultas Kedokteran dan Ilmu Kesehatan',
    website: 'https://med.unismuh.ac.id',
    order: 5,
    departments: [
      { name: 'Kedokteran', degree: 'S1' },
      { name: 'Profesi Dokter', degree: 'Profesi' },
      { name: 'Kedokteran Gigi', degree: 'S1' },
      { name: 'Dokter Gigi', degree: 'Profesi' },
      { name: 'Keperawatan', degree: 'S1' },
      { name: 'Kebidanan', degree: 'S1' },
      { name: 'Bidan', degree: 'Profesi' },
      { name: 'Farmasi', degree: 'S1' },
      { name: 'Pendidikan Profesi Apoteker', degree: 'Profesi' },
      { name: 'Administrasi Rumah Sakit', degree: 'S1' },
      { name: 'Ilmu Biomedis', degree: 'S2' },
      { name: 'Anestesi dan Terapi Intensif', degree: 'Spesialis' },
      { name: 'Bedah', degree: 'Spesialis' },
      { name: 'Kedokteran Emergensi', degree: 'Spesialis' },
      { name: 'Dermatologi Venereologi dan Estetika', degree: 'Spesialis' },
      { name: 'Psikologi', degree: 'S1' },
    ],
  },
  {
    code: 'fkip',
    name: 'Fakultas Keguruan dan Ilmu Pendidikan',
    website: 'https://fkip.unismuh.ac.id',
    order: 6,
    departments: [
      { name: 'Pendidikan Matematika', degree: 'S1' },
      { name: 'Pendidikan Bahasa Inggris', degree: 'S1' },
      { name: 'Pendidikan Bahasa dan Sastra Indonesia', degree: 'S1' },
      { name: 'Pendidikan Biologi', degree: 'S1' },
      { name: 'Pendidikan Fisika', degree: 'S1' },
      { name: 'Pendidikan Guru Sekolah Dasar', degree: 'S1' },
      { name: 'Pendidikan Guru Pendidikan Anak Usia Dini', degree: 'S1' },
      { name: 'Pendidikan Sosiologi', degree: 'S1' },
      { name: 'Pendidikan Seni Rupa', degree: 'S1' },
      { name: 'Pendidikan Pancasila dan Kewarganegaraan', degree: 'S1' },
      { name: 'Pendidikan Kepelatihan Olahraga', degree: 'S1' },
      { name: 'Pendidikan Ilmu Pengetahuan Alam', degree: 'S1' },
      { name: 'Teknologi Pendidikan', degree: 'S1' },
      { name: 'Pendidikan Profesi Guru', degree: 'Profesi' },
    ],
  },
  {
    code: 'faperta',
    name: 'Fakultas Pertanian',
    website: 'https://faperta.unismuh.ac.id',
    order: 7,
    departments: [
      { name: 'Agribisnis', degree: 'S1' },
      { name: 'Agroteknologi', degree: 'S1' },
      { name: 'Kehutanan', degree: 'S1' },
      { name: 'Budidaya Perairan', degree: 'S1' },
    ],
  },
  {
    code: 'fh',
    name: 'Fakultas Hukum',
    website: 'https://fh.unismuh.ac.id',
    order: 8,
    departments: [
      { name: 'Ilmu Hukum', degree: 'S1' },
      { name: 'Hukum Bisnis', degree: 'S1' },
    ],
  },
  {
    code: 'pasca',
    name: 'Fakultas Pascasarjana',
    website: 'https://pasca.unismuh.ac.id',
    order: 9,
    departments: [
      { name: 'Magister Manajemen', degree: 'S2' },
      { name: 'Magister Agribisnis', degree: 'S2' },
      { name: 'Magister Ilmu Administrasi Publik', degree: 'S2' },
      { name: 'Magister Pendidikan Agama Islam', degree: 'S2' },
      { name: 'Magister Pendidikan Bahasa dan Sastra Indonesia', degree: 'S2' },
      { name: 'Magister Pendidikan Bahasa Inggris', degree: 'S2' },
      { name: 'Magister Pendidikan Dasar', degree: 'S2' },
      { name: 'Magister Pendidikan Sosiologi', degree: 'S2' },
      { name: 'Magister Pendidikan Matematika', degree: 'S2' },
      { name: 'Magister Pendidikan Islam', degree: 'S3' },
    ],
  },
];

const INDEXATIONS = [
  { code: 'scopus_q1', name: 'Scopus', level: 'Q1', badgeColor: '#DC2626' },
  { code: 'scopus_q2', name: 'Scopus', level: 'Q2', badgeColor: '#EA580C' },
  { code: 'scopus_q3', name: 'Scopus', level: 'Q3', badgeColor: '#CA8A04' },
  { code: 'scopus_q4', name: 'Scopus', level: 'Q4', badgeColor: '#16A34A' },
  { code: 'sinta_1', name: 'SINTA', level: 'S1', badgeColor: '#1D4ED8' },
  { code: 'sinta_2', name: 'SINTA', level: 'S2', badgeColor: '#2563EB' },
  { code: 'sinta_3', name: 'SINTA', level: 'S3', badgeColor: '#3B82F6' },
  { code: 'sinta_4', name: 'SINTA', level: 'S4', badgeColor: '#60A5FA' },
  { code: 'sinta_5', name: 'SINTA', level: 'S5', badgeColor: '#93C5FD' },
  { code: 'sinta_6', name: 'SINTA', level: 'S6', badgeColor: '#BFDBFE' },
  { code: 'wos_scie', name: 'Web of Science', level: 'SCIE', badgeColor: '#7C3AED' },
  { code: 'wos_ssci', name: 'Web of Science', level: 'SSCI', badgeColor: '#8B5CF6' },
  { code: 'wos_esci', name: 'Web of Science', level: 'ESCI', badgeColor: '#A78BFA' },
  { code: 'doaj', name: 'DOAJ', level: null, badgeColor: '#059669' },
  { code: 'garuda', name: 'Garuda', level: null, badgeColor: '#6B7280' },
];

function slugify(faculty: string, name: string, degree?: string): string {
  return `${faculty}-${name}-${degree ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  let departmentCount = 0;

  for (const faculty of FACULTIES) {
    const saved = await prisma.faculty.upsert({
      where: { code: faculty.code },
      update: { name: faculty.name, website: faculty.website, order: faculty.order },
      create: {
        code: faculty.code,
        name: faculty.name,
        website: faculty.website,
        order: faculty.order,
      },
    });

    for (const department of faculty.departments) {
      const slug = slugify(faculty.code, department.name, department.degree);
      await prisma.department.upsert({
        where: { slug },
        update: { name: department.name, degree: department.degree ?? null },
        create: {
          slug,
          facultyId: saved.id,
          name: department.name,
          degree: department.degree ?? null,
        },
      });
      departmentCount++;
    }
  }

  for (const indexation of INDEXATIONS) {
    await prisma.indexation.upsert({
      where: { code: indexation.code },
      update: indexation,
      create: indexation,
    });
  }

  console.log(
    `Seed selesai: ${FACULTIES.length} fakultas, ${departmentCount} program studi, ${INDEXATIONS.length} indeksasi.`,
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
