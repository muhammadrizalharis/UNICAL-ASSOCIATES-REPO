import { createHash, timingSafeEqual } from 'node:crypto';

export type GateTier = 'member' | 'admin' | 'super_admin';

/**
 * Membandingkan dua string tanpa membocorkan posisi karakter yang berbeda
 * lewat selisih waktu eksekusi. Keduanya di-hash dulu agar panjang string
 * tidak ikut terbaca dari durasi perbandingan.
 */
export function timingSafeEquals(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest();
  const digestB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(digestA, digestB);
}

/** Peran menentukan pintu masuk mana yang wajib dipakai. */
export function tierOfRole(role: string): GateTier {
  if (role === 'SUPER_ADMIN') return 'super_admin';
  if (role === 'FACULTY_ADMIN' || role === 'MODERATOR') return 'admin';
  return 'member';
}

export interface GateConfig {
  admin: string;
  superAdmin: string;
}

export function readGateConfig(
  env: NodeJS.ProcessEnv = process.env,
): GateConfig {
  return {
    admin: env.ADMIN_GATE ?? 'assoc=-01',
    superAdmin: env.SUPER_ADMIN_GATE ?? 'assoc=-000',
  };
}

/**
 * Memastikan pengguna masuk lewat URL yang sesuai perannya. Anggota biasa
 * ditolak bila mencoba pintu admin, dan admin ditolak bila lewat pintu umum.
 */
export function isGateValid(
  role: string,
  providedGate: string | undefined,
  config: GateConfig,
): boolean {
  const gate = providedGate?.trim() ?? '';
  const tier = tierOfRole(role);

  if (tier === 'member') return gate === '';
  if (tier === 'admin')
    return gate !== '' && timingSafeEquals(gate, config.admin);
  return gate !== '' && timingSafeEquals(gate, config.superAdmin);
}

/** Halaman tujuan setelah login berhasil. */
export function homePathForRole(role: string): string {
  return tierOfRole(role) === 'member' ? '/dashboard' : '/admin';
}
