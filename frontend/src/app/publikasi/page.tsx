import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { dict, getLang } from '@/lib/i18n';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { MobileMenu } from '@/components/mobile-menu';
import { SiteFooter } from '@/components/site-footer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jelajahi Publikasi · UNICAL ASSOCIATES REPO' };

interface Hit {
  id: string;
  doi: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  year: number | null;
  citationCount: number;
  viewCount: number;
  indexations: string[];
}

interface SearchResponse {
  data: Hit[];
  meta: {
    page: number;
    total: number;
    took: number | null;
    engine: string;
    facets: Record<string, Record<string, number>>;
  };
}

const INDEX_LABEL: Record<string, string> = {
  scopus_q1: 'Scopus Q1',
  scopus_q2: 'Scopus Q2',
  scopus_q3: 'Scopus Q3',
  scopus_q4: 'Scopus Q4',
  sinta_1: 'SINTA S1',
  sinta_2: 'SINTA S2',
  sinta_3: 'SINTA S3',
  sinta_4: 'SINTA S4',
  sinta_5: 'SINTA S5',
  sinta_6: 'SINTA S6',
  wos_scie: 'WoS SCIE',
  wos_ssci: 'WoS SSCI',
  wos_esci: 'WoS ESCI',
  doaj: 'DOAJ',
  garuda: 'Garuda',
};

const TYPE_LABEL: Record<string, string> = {
  JOURNAL_ARTICLE: 'Artikel Jurnal',
  PROCEEDING: 'Prosiding',
  BOOK_CHAPTER: 'Bab Buku',
  BOOK: 'Buku',
  PREPRINT: 'Preprint',
};

const SORT_IDS = ['', 'newest', 'citations', 'views'] as const;

type Query = Record<string, string | undefined>;

function buildHref(current: Query, changes: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/publikasi?${qs}` : '/publikasi';
}

/** Menambah atau membuang satu nilai dari parameter yang berisi daftar. */
function toggleValue(list: string | undefined, value: string): string | undefined {
  const items = (list ?? '').split(',').filter(Boolean);
  const next = items.includes(value)
    ? items.filter((i) => i !== value)
    : [...items, value];
  return next.length ? next.join(',') : undefined;
}

export default async function PublikasiPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const current = await searchParams;
  const lang = await getLang();
  const t = dict(lang);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) params.set(key, value);
  }

  let result: SearchResponse | null = null;
  try {
    result = await apiFetch<SearchResponse>(`/search?${params}`);
  } catch {
    result = null;
  }

  const facets = result?.meta.facets ?? {};
  const activeIndex = (current.index ?? '').split(',').filter(Boolean);
  const activeType = current.type ?? '';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold text-indigo-700">
            UNICAL ASSOCIATES REPO
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/peneliti" className="hidden text-slate-600 hover:text-indigo-700 sm:block">
              {t.common.researchers}
            </Link>
            <Link href="/statistik" className="hidden text-slate-600 hover:text-indigo-700 sm:block">
              Statistik
            </Link>
            <ThemeToggle />
            <LanguageToggle lang={lang} />
            <MobileMenu
              items={[
                { href: '/welcome', label: 'Beranda' },
                { href: '/peneliti', label: t.common.researchers },
                { href: '/statistik', label: 'Statistik' },
              ]}
            />
            <Link
              href="/masuk"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              {t.common.login}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">{t.publikasi.title}</h1>

        <form className="mt-4 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={current.q ?? ''}
            placeholder={t.publikasi.searchPlaceholder}
            className="min-w-48 flex-1 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <input
            name="author"
            defaultValue={current.author ?? ''}
            placeholder={t.publikasi.authorPlaceholder}
            className="w-56 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            {t.common.search}
          </button>
        </form>

        {!result && (
          <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {t.publikasi.loadFailed}
          </p>
        )}

        {result && (
          <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
            <aside className="space-y-5">
              <FacetGroup
                title={t.publikasi.facetIndexation}
                entries={facets.indexations}
                labels={INDEX_LABEL}
                active={activeIndex}
                hrefFor={(code) =>
                  buildHref(current, {
                    index: toggleValue(current.index, code),
                    page: undefined,
                  })
                }
              />
              <FacetGroup
                title={t.publikasi.facetType}
                entries={facets.type}
                labels={TYPE_LABEL}
                active={activeType ? [activeType] : []}
                hrefFor={(type) =>
                  buildHref(current, {
                    type: activeType === type ? undefined : type,
                    page: undefined,
                  })
                }
              />
              <FacetGroup
                title={t.publikasi.facetYear}
                entries={facets.year}
                labels={{}}
                active={
                  current.year_from && current.year_from === current.year_to
                    ? [current.year_from]
                    : []
                }
                hrefFor={(year) =>
                  buildHref(current, {
                    year_from: current.year_from === year ? undefined : year,
                    year_to: current.year_to === year ? undefined : year,
                    page: undefined,
                  })
                }
              />

              {(current.index || current.type || current.year_from) && (
                <Link
                  href={buildHref({}, { q: current.q })}
                  className="block text-sm text-indigo-600 hover:underline"
                >
                  {t.publikasi.clearFilters}
                </Link>
              )}
            </aside>

            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  {result.meta.total} {t.publikasi.results}
                  {result.meta.took !== null && ` · ${result.meta.took} ms`}
                  <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                    {result.meta.engine}
                  </span>
                </p>

                <div className="flex gap-1 text-xs">
                  {SORT_IDS.map((id) => {
                    const label = {
                      '': t.publikasi.sortRelevance,
                      newest: t.publikasi.sortNewest,
                      citations: t.publikasi.sortMostCited,
                      views: t.publikasi.sortMostViewed,
                    }[id];
                    return (
                      <Link
                        key={id || 'relevance'}
                        href={buildHref(current, { sort: id || undefined })}
                        className={`rounded px-2 py-1 transition ${
                          (current.sort ?? '') === id
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {result.data.length === 0 && (
                  <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                    {t.publikasi.noMatch}
                  </p>
                )}

                {result.data.map((hit) => (
                  <article
                    key={hit.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="mb-1 flex flex-wrap gap-1">
                      {hit.indexations.map((code) => (
                        <span
                          key={code}
                          className="rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white"
                        >
                          {INDEX_LABEL[code] ?? code}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/publikasi/${hit.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-700"
                    >
                      {hit.title}
                    </Link>

                    <p className="mt-1 text-sm text-slate-600">
                      {hit.authors.slice(0, 4).join(', ')}
                      {hit.authors.length > 4 &&
                        ` +${hit.authors.length - 4} ${t.publikasi.others}`}
                    </p>

                    {hit.abstract && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {hit.abstract}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-slate-500">
                      {[
                        hit.journal,
                        hit.year,
                        `${hit.citationCount} ${t.common.citations}`,
                        `${hit.viewCount} ${t.common.views}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}

function FacetGroup({
  title,
  entries,
  labels,
  active,
  hrefFor,
}: {
  title: string;
  entries?: Record<string, number>;
  labels: Record<string, string>;
  active: string[];
  hrefFor: (value: string) => string;
}) {
  const items = Object.entries(entries ?? {}).sort((a, b) => b[1] - a[1]);
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {title}
      </p>
      <div className="space-y-1">
        {items.map(([value, count]) => (
          <Link
            key={value}
            href={hrefFor(value)}
            className={`flex items-center justify-between rounded px-2 py-1 text-sm transition ${
              active.includes(value)
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="truncate">{labels[value] ?? value}</span>
            <span
              className={`ml-2 text-xs ${
                active.includes(value) ? 'text-indigo-100' : 'text-slate-500'
              }`}
            >
              {count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
