'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { authHeader, readUser, type SessionUser } from '@/lib/session';
import { ThemeToggle } from '@/components/theme-toggle';
import { Icon } from '@/components/icons';
import { UserMenu } from '@/components/user-menu';

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
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    apiFetch<{ meta: { unread: number } }>('/notifications', {
      headers: authHeader(),
    })
      .then((res) => setUnread(res.meta.unread))
      .catch(() => undefined);
  }, []);

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
            aria-label="Notifikasi"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            <Icon name="bell" className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-[#f8fafc]">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
