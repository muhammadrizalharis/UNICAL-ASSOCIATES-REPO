'use client';

import Link from 'next/link';
import { RequireAuth, TopBar } from '@/components/require-auth';
import { Icon } from '@/components/icons';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  FACULTY_ADMIN: 'Admin Fakultas',
  MODERATOR: 'Moderator',
  MEMBER: 'Anggota',
};

const MENU_TONES: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
};

export default function ProfilPage() {
  return (
    <RequireAuth>
      {(user) => {
        const p = user.profile;
        const initial = (p?.firstName ?? user.email).charAt(0).toUpperCase();
        const roleLabel = ROLE_LABEL[user.role] ?? user.role;
        const isSuper = user.role === 'SUPER_ADMIN';

        return (
          <div className="min-h-screen bg-slate-50">
            <TopBar user={user} />

            <main className="mx-auto max-w-3xl px-4 py-8">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Profil Saya
              </p>

              {/* Kartu identitas */}
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div
                  className="h-24 bg-gradient-to-r from-[#4f46e5] via-[#6d28d9] to-[#7c3aed]"
                  aria-hidden
                />
                <div className="px-6 pb-6">
                  <div className="-mt-12 flex flex-wrap items-end gap-4">
                    <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-4xl font-bold text-[#f8fafc] shadow-lg">
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1 pb-1">
                      <h1 className="truncate text-2xl font-bold text-slate-900">
                        {p?.fullName ?? user.email}
                      </h1>
                      <p className="truncate text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${
                        isSuper
                          ? 'bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-[#f8fafc]'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {isSuper && <Icon name="shield" className="h-3 w-3" />}
                      {roleLabel}
                    </span>
                    {p?.unicalId && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {p.unicalId}
                      </span>
                    )}
                    {p && user.role === 'MEMBER' &&
                      (p.isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <Icon name="shield" className="h-3 w-3" />
                          Terverifikasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Menunggu verifikasi
                        </span>
                      ))}
                  </div>

                  <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <Detail label="ORCID" value={p?.orcid} />
                    <Detail label="Institusi" value={p?.institution} />
                    <Detail label="Fakultas" value={p?.faculty} />
                    <Detail label="Program Studi" value={p?.department} />
                  </dl>
                </div>
              </div>

              {/* Menu akun & keamanan */}
              <h2 className="mt-8 mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">
                Akun &amp; Keamanan
              </h2>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <MenuLink
                  href="/dashboard/akun"
                  icon="key"
                  tone="indigo"
                  title="Ubah Kata Sandi"
                  desc="Ganti kata sandi akun Anda secara mandiri."
                />
                <MenuLink
                  href="/dashboard/keamanan"
                  icon="shield"
                  tone="emerald"
                  title="Keamanan & 2FA"
                  desc="Autentikasi dua faktor dan perangkat yang login."
                />
                {p?.unicalId && (
                  <MenuLink
                    href={`/profil/${p.unicalId}`}
                    icon="eye"
                    tone="amber"
                    title="Profil Publik"
                    desc="Lihat profil Anda sebagaimana dilihat pengunjung."
                  />
                )}
                <MenuLink
                  href="/dashboard/notifikasi"
                  icon="bell"
                  tone="rose"
                  title="Notifikasi"
                  desc="Kabar klaim, komentar, pengikut, dan login baru."
                />
              </div>

              <div className="mt-6">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  ← Kembali ke Dashboard
                </Link>
              </div>
            </main>
          </div>
        );
      }}
    </RequireAuth>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || '—'}</dd>
    </div>
  );
}

function MenuLink({
  href,
  icon,
  tone,
  title,
  desc,
}: {
  href: string;
  icon: string;
  tone: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${MENU_TONES[tone]}`}
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{desc}</p>
      </div>
      <Icon
        name="chevron"
        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500"
      />
    </Link>
  );
}
