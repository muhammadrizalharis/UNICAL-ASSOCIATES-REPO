'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { authHeader, clearSession, readUser, type SessionUser } from '@/lib/session';
import { ThemeToggle } from '@/components/theme-toggle';

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

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div>
          <p className="font-bold text-indigo-700">UNICAL ASSOCIATES REPO</p>
          <p className="text-xs text-slate-500">
            {user.profile?.fullName} · {user.role}
            {user.profile?.unicalId && ` · ${user.profile.unicalId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/dashboard/notifikasi"
            title="Notifikasi"
            className="relative rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/akun"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Akun
          </Link>
          <button
            onClick={() => {
              clearSession();
              router.replace('/masuk');
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
