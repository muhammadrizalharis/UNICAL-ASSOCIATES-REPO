'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export interface NavChild {
  href: string;
  label: string;
  /** Tautan non-Next (mis. /api/docs) dirender sebagai <a>. */
  external?: boolean;
}

export interface NavGroup {
  label: string;
  icon: 'home' | 'book' | 'layers' | 'shield' | 'info';
  /** Tanpa items = tautan langsung (Beranda). */
  href?: string;
  items?: NavChild[];
}

const ICONS: Record<NavGroup['icon'], React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />,
  book: (
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM8 7h8M8 11h5" />
  ),
  layers: (
    <path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />
  ),
  shield: (
    <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10zM9 12l2 2 4-4" />
  ),
  info: (
    <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01" />
  ),
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Bar navigasi utama: Beranda langsung, sisanya dropdown ber-submenu. */
export function SiteNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar atau pindah halaman.
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);
  useEffect(() => setOpen(null), [pathname]);

  const childActive = (child: NavChild) =>
    pathname === child.href || pathname.startsWith(child.href + '/');

  const groupActive = (group: NavGroup) => {
    if (group.href) {
      return pathname === group.href || pathname.startsWith(group.href + '/');
    }
    return (group.items ?? []).some(
      (c) =>
        childActive(c) ||
        // /profil dihitung bagian Peneliti di grup Repositori.
        (c.href === '/peneliti' && pathname.startsWith('/profil')),
    );
  };

  const pill = (active: boolean) =>
    active
      ? 'flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1.5 text-sm font-semibold text-[#f8fafc] shadow-lg shadow-indigo-500/25'
      : 'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-indigo-50 hover:text-indigo-700';

  return (
    <div ref={ref} className="border-t border-slate-100">
      <nav
        aria-label="Navigasi utama"
        className="mx-auto flex max-w-7xl items-center gap-1 px-3 py-2 whitespace-nowrap"
      >
        {groups.map((group) => {
          const active = groupActive(group);
          const icon = (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0"
              aria-hidden
            >
              {ICONS[group.icon]}
            </svg>
          );

          if (group.href) {
            return (
              <Link
                key={group.label}
                href={group.href}
                aria-current={active ? 'page' : undefined}
                className={pill(active)}
              >
                {icon}
                {group.label}
              </Link>
            );
          }

          const isOpen = open === group.label;
          return (
            <div key={group.label} className="relative">
              <button
                onClick={() => setOpen(isOpen ? null : group.label)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={pill(active)}
              >
                {icon}
                {group.label}
                <Chevron open={isOpen} />
              </button>

              {isOpen && (
                <div
                  role="menu"
                  className="animate-fade-up absolute left-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-indigo-950/10 [animation-duration:200ms]"
                >
                  {(group.items ?? []).map((child) => {
                    const activeChild = childActive(child);
                    const cls = activeChild
                      ? 'flex items-center gap-2 border-l-2 border-indigo-600 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700'
                      : 'flex items-center gap-2 border-l-2 border-transparent px-4 py-2.5 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-700';
                    return child.external ? (
                      <a key={child.href} href={child.href} className={cls} role="menuitem">
                        {child.label}
                      </a>
                    ) : (
                      <Link key={child.href} href={child.href} className={cls} role="menuitem">
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {/* Garis aksen merek di bawah nav — senada footer */}
      <div
        className="h-0.5 w-full bg-gradient-to-r from-indigo-600/70 via-violet-500/70 to-indigo-600/70"
        aria-hidden
      />
    </div>
  );
}
