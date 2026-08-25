'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { authHeader, clearSession, readUser, type SessionUser } from '@/lib/session';
import { ThemeToggle } from '@/components/theme-toggle';
import { Icon } from '@/components/icons';

export function RequireAuth({
  staffOnly = false,
  children,
}: {
  staffOnly?: boolean;
  children: (user: SessionUser) => React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const current = readUser();

    if (!current) {
      router.replace('/masuk');
      return;
    }

    // Penjagaan sesungguhnya ada di server; ini hanya mencegah salah halaman.
    if (staffOnly && current.role === 'MEMBER') {
      router.replace('/dashboard');
      return;
    }

    setUser(current);
    setChecked(true);
  }, [router, staffOnly]);

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Memuat…
      </div>
    );
  }

  return <>{children(user)}</>;
}

export function TopBar({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    apiFetch<{ meta: { unread: number } }>('/notifications', {
      headers: authHeader(),
    })
      .then((res) => setUnread(res.meta.unread))
      .catch(() => undefined);
  }, []);

  const initial = (user.profile?.firstName ?? user.email).charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div
        className="h-0.5 w-full bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#4f46e5]"
        aria-hidden
      />
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="group flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-unical.png"
            alt="Logo UNICAL ASSOCIATES REPO"
            className="h-9 w-9 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-slate-900 transition group-hover:text-indigo-700">
              UNICAL ASSOCIATES REPO
            </p>
            <p className="truncate text-xs text-slate-500">
              {user.profile?.fullName ?? user.email}
            </p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/dashboard/notifikasi"
            title="Notifikasi"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            <Icon name="bell" className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-[#f8fafc]">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/profil"
            title="Profil saya"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 py-1 pr-3 pl-1 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/60"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-xs font-bold text-[#f8fafc]">
              {user.profile?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profile.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </span>
            <span className="hidden sm:inline">Profil</span>
          </Link>
          <button
            onClick={() => {
              clearSession();
              router.replace('/masuk');
            }}
            title="Keluar"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-sm font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
