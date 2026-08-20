import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { dict, getLang } from '@/lib/i18n';
import { LanguageToggle } from '@/components/language-toggle';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'UNICAL ASSOCIATES REPO — Repositori Publikasi Ilmiah Unismuh Makassar',
  description:
    'Repositori publikasi ilmiah Universitas Muhammadiyah Makassar: telusuri artikel jurnal, prosiding, dan buku dengan metrik sitasi otomatis.',
};

interface Stats {
  totals: {
    publications: number;
    researchers: number;
    citations: number;
    journals: number;
  };
  topCited: {
    id: string;
    title: string;
    citationCount: number;
    year: number | null;
    journal: string | null;
  }[];
}

async function loadStats(): Promise<Stats | null> {
  try {
    const body = await apiFetch<{ data: Stats }>('/stats');
    return body.data;
  } catch {
    return null;
  }
}

export default async function WelcomePage() {
  const lang = await getLang();
  const t = dict(lang);
  const stats = await loadStats();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-bold text-indigo-700">UNICAL ASSOCIATES REPO</p>
            <p className="text-[11px] tracking-wide text-slate-400">{t.landing.tagline}</p>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/publikasi"
              className="hidden text-slate-600 hover:text-indigo-700 sm:block"
            >
              {t.common.publications}
            </Link>
            <Link
              href="/peneliti"
              className="hidden text-slate-600 hover:text-indigo-700 sm:block"
            >
              {t.common.researchers}
            </Link>
            <Link
              href="/statistik"
              className="hidden text-slate-600 hover:text-indigo-700 sm:block"
            >
              Statistik
            </Link>
            <LanguageToggle lang={lang} />
            <Link
              href="/masuk"
              className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
            >
              {t.landing.ctaLogin}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero + pencarian */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              {t.landing.heroTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              {t.landing.heroSubtitle}
            </p>

            <form action="/publikasi" className="mx-auto mt-8 flex max-w-xl gap-2">
              <input
                name="q"
                placeholder={t.landing.searchPlaceholder}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-3 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <button className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-700">
                {t.landing.searchButton}
              </button>
            </form>
          </div>
        </section>

        {/* Statistik hidup */}
        {stats && (
          <section className="mx-auto max-w-5xl px-4 py-10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={stats.totals.publications} label={t.landing.statPublications} />
              <Stat value={stats.totals.citations} label={t.landing.statCitations} />
              <Stat value={stats.totals.researchers} label={t.landing.statResearchers} />
              <Stat value={stats.totals.journals} label={t.landing.statJournals} />
            </div>
          </section>
        )}

        {/* Karya tersitasi teratas */}
        {stats && stats.topCited.length > 0 && (
          <section className="mx-auto max-w-5xl px-4 pb-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {t.landing.topCited}
              </h2>
              <Link
                href="/publikasi?sort=citations"
                className="text-sm text-indigo-600 hover:underline"
              >
                {t.landing.seeAll}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.topCited.slice(0, 3).map((pub) => (
                <Link
                  key={pub.id}
                  href={`/publikasi/${pub.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <p className="line-clamp-3 font-medium text-slate-900">{pub.title}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {[pub.journal, pub.year].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-indigo-700">
                    {pub.citationCount} {t.common.citations}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Fitur unggulan */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-center text-lg font-semibold text-slate-900">
              {t.landing.featureTitle}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Feature icon="⚡" title={t.landing.featureDoi} body={t.landing.featureDoiBody} />
              <Feature icon="🆔" title={t.landing.featureId} body={t.landing.featureIdBody} />
              <Feature icon="📚" title={t.landing.featureExport} body={t.landing.featureExportBody} />
              <Feature icon="🔓" title={t.landing.featureOpen} body={t.landing.featureOpenBody} />
            </div>
          </div>
        </section>

        {/* Ajakan daftar */}
        <section className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">{t.landing.ctaTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">{t.landing.ctaBody}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/daftar"
              className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
            >
              {t.landing.ctaRegister}
            </Link>
            <Link
              href="/masuk"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.landing.ctaLogin}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} UNICAL ASSOCIATES · Universitas Muhammadiyah Makassar</p>
          <nav className="flex gap-4">
            <Link href="/kebijakan" className="hover:text-indigo-700">
              {t.landing.footerPolicy}
            </Link>
            <Link href="/statistik" className="hover:text-indigo-700">
              {t.landing.footerStats}
            </Link>
            <a href="/api/docs" className="hover:text-indigo-700">
              {t.landing.footerApi}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
      <p className="text-3xl font-bold text-indigo-700">
        {value.toLocaleString('id-ID')}
      </p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-5">
      <p className="text-2xl">{icon}</p>
      <p className="mt-2 font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
