import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { dict, getLang } from '@/lib/i18n';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { CountUp } from '@/components/count-up';
import { SiteFooter } from '@/components/site-footer';
import { LoginForm } from '@/components/login-form';
import { Reveal } from '@/components/reveal';

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

interface TopResearcher {
  unicalId: string;
  fullName: string;
  hIndex: number;
  totalCitations: number;
  department: { name: string } | null;
  _count: { authorships: number };
}

async function loadStats(): Promise<Stats | null> {
  try {
    const body = await apiFetch<{ data: Stats }>('/stats');
    return body.data;
  } catch {
    return null;
  }
}

async function loadTopResearchers(): Promise<TopResearcher[]> {
  try {
    const body = await apiFetch<{ data: TopResearcher[] }>('/researchers');
    return body.data.slice(0, 4);
  } catch {
    return [];
  }
}

const POPULAR_KEYWORDS = ['machine learning', 'clustering', 'deep learning', 'fuzzy'];

export default async function WelcomePage() {
  const lang = await getLang();
  const t = dict(lang);
  const [stats, topResearchers] = await Promise.all([
    loadStats(),
    loadTopResearchers(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-extrabold tracking-tight text-slate-900">
              UNICAL <span className="text-indigo-600 dark:text-indigo-400">ASSOCIATES</span> REPO
            </p>
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
        {/* Layar kecil: tautan tampil langsung, tanpa menu tersembunyi */}
        <nav className="flex gap-5 overflow-x-auto border-t border-slate-100 px-4 py-2 text-sm whitespace-nowrap sm:hidden">
          <Link href="/publikasi" className="text-slate-600 hover:text-indigo-700">
            {t.common.publications}
          </Link>
          <Link href="/peneliti" className="text-slate-600 hover:text-indigo-700">
            {t.common.researchers}
          </Link>
          <Link href="/statistik" className="text-slate-600 hover:text-indigo-700">
            Statistik
          </Link>
          <Link href="/kebijakan" className="text-slate-600 hover:text-indigo-700">
            {t.landing.footerPolicy}
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero adaptif: terang bergradasi indigo, gelap bernuansa navy */}
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-100/70 via-slate-50 to-slate-50">
          <div className="bg-dots absolute inset-0" aria-hidden />
          <div
            className="animate-float-slow absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-600/30"
            aria-hidden
          />
          <div
            className="animate-float-slow absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl [animation-delay:-4s] dark:bg-violet-600/20"
            aria-hidden
          />

          <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:py-24">
            <p className="animate-fade-up mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {t.landing.badge}
            </p>

            <h1 className="animate-fade-up delay-100 mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.15]">
              {lang === 'id' ? (
                <>
                  Repositori Publikasi Ilmiah{' '}
                  <span className="animate-gradient-x bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400">
                    Universitas Muhammadiyah Makassar
                  </span>
                </>
              ) : (
                <>
                  Scientific Publication Repository of{' '}
                  <span className="animate-gradient-x bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400">
                    Universitas Muhammadiyah Makassar
                  </span>
                </>
              )}
            </h1>

            <p className="animate-fade-up delay-200 mx-auto mt-5 max-w-2xl text-slate-600">
              {t.landing.heroSubtitle}
            </p>

            <form
              action="/publikasi"
              className="animate-fade-up delay-300 mx-auto mt-9 flex max-w-xl gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-indigo-200/60 backdrop-blur dark:shadow-indigo-950/50"
            >
              <input
                name="q"
                placeholder={t.landing.searchPlaceholder}
                className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-slate-900 placeholder-slate-400 outline-none"
              />
              <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-[#f8fafc] shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500">
                {t.landing.searchButton}
              </button>
            </form>

            <p className="animate-fade-up delay-300 mt-4 text-xs text-slate-500">
              {t.landing.popular}{' '}
              {POPULAR_KEYWORDS.map((k) => (
                <Link
                  key={k}
                  href={`/publikasi?q=${encodeURIComponent(k)}`}
                  className="mx-1 inline-block rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-slate-600 transition hover:border-indigo-400 hover:text-indigo-700"
                >
                  {k}
                </Link>
              ))}
            </p>
          </div>

          {/* Statistik hidup menempel di dasar hero */}
          {stats && (
            <div className="relative mx-auto max-w-5xl px-4 pb-14">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat value={stats.totals.publications} label={t.landing.statPublications} />
                <Stat value={stats.totals.citations} label={t.landing.statCitations} />
                <Stat value={stats.totals.researchers} label={t.landing.statResearchers} />
                <Stat value={stats.totals.journals} label={t.landing.statJournals} />
              </div>
            </div>
          )}
        </section>

        {/* Cara kerja 3 langkah */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <Reveal>
              <h2 className="text-center text-2xl font-bold text-slate-900">
                {t.landing.howTitle}
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Reveal><Step no="1" title={t.landing.how1} body={t.landing.how1Body} /></Reveal>
              <Reveal delay={120}><Step no="2" title={t.landing.how2} body={t.landing.how2Body} /></Reveal>
              <Reveal delay={240}><Step no="3" title={t.landing.how3} body={t.landing.how3Body} /></Reveal>
            </div>
          </div>
        </section>

        {/* Karya tersitasi teratas */}
        {stats && stats.topCited.length > 0 && (
          <section className="mx-auto max-w-5xl px-4 py-12">
            <Reveal>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  {t.landing.topCited}
                </h2>
                <Link
                  href="/publikasi?sort=citations"
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  {t.landing.seeAll}
                </Link>
              </div>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.topCited.slice(0, 3).map((pub, i) => (
                <Reveal key={pub.id} delay={i * 120} className="h-full">
                  <Link
                    href={`/publikasi/${pub.id}`}
                    className="group relative block h-full overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100"
                  >
                    <span className="absolute -top-3 -right-1 text-7xl font-extrabold text-slate-100 transition group-hover:text-indigo-100">
                      {i + 1}
                    </span>
                    <p className="relative line-clamp-3 font-semibold text-slate-900">
                      {pub.title}
                    </p>
                    <p className="relative mt-2 text-xs text-slate-500">
                      {[pub.journal, pub.year].filter(Boolean).join(' · ')}
                    </p>
                    <p className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-700">
                      📈 {pub.citationCount} {t.common.citations}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* Peneliti teratas */}
        {topResearchers.length > 0 && (
          <section className="border-y border-slate-200 bg-white">
            <div className="mx-auto max-w-5xl px-4 py-12">
              <Reveal>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {t.landing.topResearchers}
                  </h2>
                  <Link
                    href="/peneliti"
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    {t.landing.seeAll}
                  </Link>
                </div>
              </Reveal>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {topResearchers.map((r, i) => (
                  <Reveal key={r.unicalId} delay={i * 100} className="h-full">
                    <Link
                      href={`/profil/${r.unicalId}`}
                      className="group block h-full rounded-xl border border-slate-200 p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-[#f8fafc] shadow-lg shadow-indigo-200 transition group-hover:scale-110">
                        {r.fullName.charAt(0).toUpperCase()}
                      </div>
                      <p className="mt-3 line-clamp-1 font-semibold text-slate-900">
                        {r.fullName}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {r.department?.name ?? r.unicalId}
                      </p>
                      <p className="mt-2 text-sm font-bold text-indigo-700">
                        {r._count.authorships} {t.common.publications.toLowerCase()}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        h-index {r.hIndex} · {r.totalCitations} {t.common.citations}
                      </p>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Ajakan daftar + login langsung dari beranda */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#6d28d9]">
          <div className="bg-dots-dark absolute inset-0" aria-hidden />
          <div
            className="absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-[#f8fafc]/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 md:grid-cols-2">
            <Reveal>
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-[#f8fafc]">
                  {t.landing.ctaTitle}
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-[#c7d2fe] md:mx-0">
                  {t.landing.ctaBody}
                </p>
                <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left text-sm text-[#e0e7ff] md:mx-0">
                  {[t.landing.ctaPoint1, t.landing.ctaPoint2, t.landing.ctaPoint3].map(
                    (point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f8fafc]/15 text-[11px] font-bold text-[#a7f3d0]"
                          aria-hidden
                        >
                          ✓
                        </span>
                        {point}
                      </li>
                    ),
                  )}
                </ul>
                <Link
                  href="/daftar"
                  className="mt-8 inline-block rounded-xl bg-[#f8fafc] px-7 py-3.5 font-semibold text-[#4338ca] shadow-xl shadow-indigo-900/30 transition hover:-translate-y-0.5 hover:bg-[#e0e7ff]"
                >
                  {t.landing.ctaRegister}
                </Link>
              </div>
            </Reveal>

            {/* Kartu login langsung — tanpa pindah halaman */}
            <Reveal delay={150}>
              <div className="rounded-2xl border border-[#f8fafc]/25 bg-white p-6 shadow-2xl shadow-[#1e1b4b]/50 sm:p-7">
                <p className="text-lg font-bold text-slate-900">
                  {t.landing.loginCardTitle}
                </p>
                <p className="mt-0.5 mb-5 text-xs text-slate-500">
                  {t.landing.loginCardHint}
                </p>
                <LoginForm />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-indigo-300">
      <p className="text-3xl font-extrabold text-slate-900">
        <CountUp end={value} />
      </p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Step({ no, title, body }: { no: string; title: string; body: string }) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-6 transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-[#f8fafc] shadow-md">
        {no}
      </span>
      <p className="mt-3 font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
