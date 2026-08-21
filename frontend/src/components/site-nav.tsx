'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  icon: 'home' | 'book' | 'users' | 'chart' | 'shield';
  /** Awalan path lain yang membuat item ini dianggap aktif. */
  also?: string[];
}

const ICONS: Record<NavItem['icon'], React.ReactNode> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />
  ),
  book: (
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15zM8 7h8M8 11h5" />
  ),
  users: (
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.87M15.5 3.13a4 4 0 0 1 0 7.75" />
  ),
  chart: (
    <path d="M3 3v18h18M8 17V9m5 8V5m5 12v-6" />
  ),
  shield: (
    <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10zM9 12l2 2 4-4" />
  ),
};

/** Bar navigasi utama: pil aktif bergradien, ikon garis, sticky-friendly. */
export function SiteNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    pathname === item.href ||
    pathname.startsWith(item.href + '/') ||
    (item.also ?? []).some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <div className="border-t border-slate-100">
      <nav
        aria-label="Navigasi utama"
        className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 py-2 whitespace-nowrap"
      >
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1.5 text-sm font-semibold text-[#f8fafc] shadow-lg shadow-indigo-500/25'
                  : 'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-indigo-50 hover:text-indigo-700'
              }
            >
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
                {ICONS[item.icon]}
              </svg>
              {item.label}
            </Link>
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
