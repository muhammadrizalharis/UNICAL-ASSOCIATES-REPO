'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession, readUser, type SessionUser } from '@/lib/session';

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
      router.replace('/welcome');
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
        <button
          onClick={() => {
            clearSession();
            router.replace('/welcome');
          }}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
