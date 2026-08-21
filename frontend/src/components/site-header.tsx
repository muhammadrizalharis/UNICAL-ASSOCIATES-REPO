import Link from 'next/link';
import { dict, type Lang } from '@/lib/i18n';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { SiteNav } from '@/components/site-nav';

/** Header publik seragam: merek + toggle + Masuk + nav pil, selalu sticky. */
export function SiteHeader({ lang }: { lang: Lang }) {
  const t = dict(lang);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/welcome" className="group">
          <p className="font-extrabold tracking-tight text-slate-900 transition group-hover:text-indigo-700">
            UNICAL <span className="text-indigo-600 dark:text-indigo-400">ASSOCIATES</span> REPO
          </p>
          <p className="text-[11px] tracking-wide text-slate-400">
            {t.landing.tagline}
          </p>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          <LanguageToggle lang={lang} />
          <Link
            href="/masuk"
            className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-[#f8fafc] shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
          >
            {t.landing.ctaLogin}
          </Link>
        </nav>
      </div>
      <SiteNav
        groups={[
          {
            href: '/welcome',
            label: lang === 'id' ? 'Beranda' : 'Home',
            icon: 'home',
          },
          {
            label: t.landing.footerRepo,
            icon: 'book',
            items: [
              { href: '/publikasi', label: t.common.publications },
              { href: '/peneliti', label: t.common.researchers },
              { href: '/statistik', label: t.landing.footerStats },
            ],
          },
          {
            label: t.landing.footerServices,
            icon: 'layers',
            items: [
              { href: '/masuk', label: t.landing.ctaLogin },
              { href: '/daftar', label: t.landing.ctaRegister },
              { href: '/api/docs', label: t.landing.footerApi, external: true },
              { href: '/kebijakan', label: t.landing.footerPolicy },
            ],
          },
        ]}
      />
    </header>
  );
}
