'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearSession, type SessionUser } from '@/lib/session';
import { Icon } from '@/components/icons';

/** Chip pengguna (avatar + nama) yang membuka dropdown: Profil, Keamanan, Keluar. */
export function UserMenu({ user }: { user: SessionUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  // Tutup menu setiap pindah halaman.
  useEffect(() => setOpen(false), [pathname]);

  const name = user.profile?.fullName ?? user.email;
  const initial = (user.profile?.firstName ?? user.email).charAt(0).toUpperCase();

  const avatar = (size: string, text: string) => (
    <span
      className={`inline-flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] ${text} font-bold text-[#f8fafc]`}
    >
      {user.profile?.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.profile.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu pengguna"
        className="flex items-center gap-2 rounded-full border border-slate-300 py-1 pr-2.5 pl-1 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/60"
      >
        {avatar('h-7 w-7', 'text-xs')}
        <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
        <Icon
          name="chevronDown"
          className={`h-3.5 w-3.5 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            {avatar('h-10 w-10', 'text-sm')}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>

          <Link
            href="/dashboard/profil"
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Icon name="user" className="h-4 w-4 text-slate-400" />
            Profil saya
          </Link>
          <Link
            href="/dashboard/keamanan"
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            <Icon name="shield" className="h-4 w-4 text-slate-400" />
            Keamanan &amp; 2FA
          </Link>

          <div className="border-t border-slate-100">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                clearSession();
                router.replace('/masuk');
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <Icon name="logout" className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
