'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiBase, apiFetch } from '@/lib/api';
import {
  authHeader,
  readToken,
  saveSession,
  type SessionUser,
} from '@/lib/session';
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
  return <RequireAuth>{(user) => <ProfileView user={user} />}</RequireAuth>;
}

function ProfileView({ user }: { user: SessionUser }) {
  const [profile, setProfile] = useState(user.profile);

  // Segarkan dari server agar bio, keahlian, dan foto terbaru selalu tampil.
  useEffect(() => {
    apiFetch<{ data: SessionUser }>('/auth/me', { headers: authHeader() })
      .then(({ data }) => {
        setProfile(data.profile);
        const token = readToken();
        if (token) saveSession(token, data);
      })
      .catch(() => undefined);
  }, []);

  const p = profile;
  const initial = (p?.firstName ?? user.email).charAt(0).toUpperCase();
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;
  const isSuper = user.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar user={user} />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            Profil Saya
          </p>
          <Link
            href="/dashboard/profil/edit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            <Icon name="pencil" className="h-4 w-4" />
            Edit Profil
          </Link>
        </div>

        {/* Kartu identitas — glassmorphism di atas latar aurora */}
        <div className="animate-fade-up relative mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-100 shadow-sm">
          {/* Aurora: bola cahaya membaur di belakang kaca */}
          <div className="animate-float-slow absolute -top-16 -left-12 h-60 w-60 rounded-full bg-indigo-400/40 blur-3xl" aria-hidden />
          <div className="animate-float-slow absolute -right-10 -bottom-20 h-60 w-60 rounded-full bg-violet-400/40 blur-3xl [animation-delay:-3s]" aria-hidden />
          <div className="animate-float-slow absolute top-4 right-1/3 h-44 w-44 rounded-full bg-sky-400/30 blur-3xl [animation-delay:-6s]" aria-hidden />

          {/* Panel kaca buram */}
          <div className="relative m-2.5 rounded-[1.4rem] border border-white/60 bg-white/55 p-6 shadow-[0_10px_40px_rgba(2,6,23,0.10)] backdrop-blur-2xl sm:p-8">
            <div className="flex flex-wrap items-center gap-5">
              <AvatarUploader initial={initial} initialUrl={p?.photoUrl ?? null} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {p?.fullName ?? user.email}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                      isSuper
                        ? 'bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-[#f8fafc]'
                        : 'bg-indigo-500/15 text-indigo-700'
                    }`}
                  >
                    {isSuper && <Icon name="shield" className="h-3 w-3" />}
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {p?.unicalId && (
                    <span className="inline-flex items-center rounded-full bg-white/60 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-white/60">
                      {p.unicalId}
                    </span>
                  )}
                  {p && user.role === 'MEMBER' &&
                    (p.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <Icon name="shield" className="h-3 w-3" />
                        Terverifikasi
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Menunggu verifikasi
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {p?.bio && (
              <p className="mt-5 text-sm leading-relaxed text-slate-700">{p.bio}</p>
            )}

            {p?.expertise && p.expertise.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {p.expertise.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
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
            href="/dashboard/profil/edit"
            icon="pencil"
            tone="indigo"
            title="Edit Profil"
            desc="Ubah nama, bio, bidang keahlian, dan afiliasi."
          />
          <MenuLink
            href="/dashboard/akun"
            icon="key"
            tone="amber"
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
              tone="rose"
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
}

async function refreshSession() {
  const me = await apiFetch<{ data: SessionUser }>('/auth/me', {
    headers: authHeader(),
  });
  const token = readToken();
  if (token) saveSession(token, me.data);
}

/** Potong tengah jadi persegi lalu perkecil ke maks 512px agar avatar konsisten. */
function cropSquare(file: File): Promise<{ url: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      const target = Math.min(512, size);
      const canvas = document.createElement('canvas');
      canvas.width = target;
      canvas.height = target;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(src);
      if (!ctx) return reject(new Error('no-ctx'));
      ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve({ url: URL.createObjectURL(blob), blob })
            : reject(new Error('no-blob')),
        'image/jpeg',
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error('load'));
    };
    img.src = src;
  });
}

function AvatarUploader({
  initial,
  initialUrl,
}: {
  initial: string;
  initialUrl: string | null;
}) {
  const [photoUrl, setPhotoUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) {
      setError('Format harus JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Ukuran berkas maksimal 8 MB.');
      return;
    }
    setError(null);
    try {
      setPreview(await cropSquare(file));
    } catch {
      setError('Gagal memproses gambar.');
    }
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', preview.blob, 'avatar.jpg');
      const res = await fetch(`${apiBase()}/researchers/me/avatar`, {
        method: 'POST',
        headers: authHeader(),
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'Gagal mengunggah foto.');
      setPhotoUrl(json.data.photoUrl as string);
      setPreview(null);
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/researchers/me/avatar`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      if (!res.ok) throw new Error('Gagal menghapus foto.');
      setPhotoUrl(null);
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus foto.');
    } finally {
      setBusy(false);
    }
  }

  const shownUrl = preview?.url ?? photoUrl;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-4xl font-bold text-[#f8fafc] shadow-xl shadow-indigo-900/25">
          {shownUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownUrl} alt="Foto profil" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
        {!preview && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            title="Ubah foto profil"
            aria-label="Ubah foto profil"
            className="absolute -right-1.5 -bottom-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#4f46e5] text-[#f8fafc] shadow-md transition hover:bg-[#4338ca] disabled:opacity-60"
          >
            {busy ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Icon name="camera" className="h-4 w-4" />
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onPick}
        />
      </div>

      {preview ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-[#f8fafc] shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? 'Menyimpan…' : 'Simpan foto'}
          </button>
          <button
            type="button"
            onClick={() => setPreview(null)}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Batal
          </button>
        </div>
      ) : (
        photoUrl && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-[11px] font-medium text-rose-600 transition hover:underline disabled:opacity-60"
          >
            Hapus foto
          </button>
        )
      )}

      {error && (
        <p className="max-w-[8rem] text-center text-[11px] text-rose-600">{error}</p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/40 px-3.5 py-2.5">
      <dt className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-800">
        {value || '—'}
      </dd>
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
