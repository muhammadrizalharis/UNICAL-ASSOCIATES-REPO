'use client';

import Link from 'next/link';
import { RequireAuth, TopBar } from '@/components/require-auth';

const STAFF_ROLES = ['MODERATOR', 'FACULTY_ADMIN', 'SUPER_ADMIN'];

export default function DashboardPage() {
  return (
    <RequireAuth>
      {(user) => {
        const isStaff = STAFF_ROLES.includes(user.role);
        return (
        <div className="min-h-screen bg-slate-50">
          <TopBar user={user} />

          <main className="mx-auto max-w-5xl px-4 py-8">
            <h1 className="text-2xl font-semibold text-slate-900">
              Halo, {user.profile?.firstName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {isStaff
                ? 'Akun pengelola — moderasi publikasi, klaim, dan verifikasi peneliti.'
                : user.profile?.department
                  ? `${user.profile.department} · ${user.profile.faculty}`
                  : 'Afiliasi belum dilengkapi.'}
            </p>

            {/* UNICAL ID hanya untuk peneliti; akun pengelola memang tanpa ID. */}
            {!isStaff && !user.profile?.unicalId && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                UNICAL ID Anda belum terbit. Admin fakultas akan memverifikasi
                data Anda terlebih dahulu.
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {isStaff && (
                <Card
                  href="/admin"
                  title="⚙️ Panel Pengelola"
                  body="Antrean moderasi publikasi, klaim kepenulisan, verifikasi peneliti, dan laporan."
                />
              )}
              <Card
                href="/dashboard/unggah"
                title="Unggah Publikasi"
                body="Tempel DOI, unggah PDF, atau impor pustaka BibTeX dan RIS."
              />
              <Card
                href="/publikasi"
                title="Jelajahi Repositori"
                body="Telusuri publikasi yang sudah terverifikasi."
              />
              <Card
                href="/peneliti"
                title="Direktori Peneliti"
                body="Lihat rekam jejak dan metrik riset sivitas akademika."
              />
              <Card
                href="/dashboard/akun"
                title="Pengaturan Akun"
                body="Ubah kata sandi Anda secara mandiri."
              />
              <Card
                href="/dashboard/keamanan"
                title="Keamanan"
                body="Aktifkan 2FA dan kelola perangkat yang login."
              />
              <Card
                href="/dashboard/notifikasi"
                title="Notifikasi"
                body="Kabar klaim, komentar, pengikut, dan login baru."
              />
              <Card
                href="/dashboard/koleksi"
                title="Koleksi Saya"
                body="Reading list publikasi yang Anda simpan."
              />
              {user.profile?.unicalId && (
                <Card
                  href={`/profil/${user.profile.unicalId}`}
                  title="Profil Publik Saya"
                  body="Tampilan profil Anda sebagaimana dilihat pengunjung."
                />
              )}
            </div>
          </main>
        </div>
        );
      }}
    </RequireAuth>
  );
}

function Card({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
    >
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </Link>
  );
}
