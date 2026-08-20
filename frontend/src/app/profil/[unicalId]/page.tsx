import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { dict, getLang } from '@/lib/i18n';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { TrendChart } from '@/components/trend-chart';
import { FollowButton } from '@/components/follow-button';

export const dynamic = 'force-dynamic';

interface Profile {
  unicalId: string;
  fullName: string;
  photoUrl: string | null;
  bio: string | null;
  institution: string | null;
  expertise: string[];
  orcid: string | null;
  scopusId: string | null;
  sintaId: string | null;
  scholarId: string | null;
  faculty: { name: string } | null;
  department: { name: string; degree: string | null } | null;
  followerCount: number;
  metrics: {
    totalPublications: number;
    totalCitations: number;
    hIndex: number;
    i10Index: number;
  };
  publicationsByYear: Record<string, number>;
  citationTrend: { date: string; citations: number }[];
  topCollaborators: { name: string; unicalId: string | null; count: number }[];
  publications: {
    id: string;
    title: string;
    journal: string | null;
    year: number | null;
    citationCount: number;
    isCorresponding: boolean;
    contributors: { name: string; unicalId: string | null; isOwner: boolean }[];
    badges: { code: string; name: string; level: string | null; badgeColor: string | null }[];
  }[];
}

async function loadProfile(unicalId: string): Promise<Profile | null> {
  try {
    const body = await apiFetch<{ data: Profile }>(`/researchers/${unicalId}`);
    return body.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ unicalId: string }>;
}) {
  const { unicalId } = await params;
  const profile = await loadProfile(unicalId);
  if (!profile) return { title: 'Peneliti tidak ditemukan' };

  return {
    title: `${profile.fullName} · UNICAL ASSOCIATES REPO`,
    description: `${profile.metrics.totalPublications} publikasi, ${profile.metrics.totalCitations} sitasi, h-index ${profile.metrics.hIndex}.`,
  };
}

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ unicalId: string }>;
}) {
  const { unicalId } = await params;
  const profile = await loadProfile(unicalId);
  if (!profile) notFound();

  const lang = await getLang();
  const t = dict(lang);

  const years = Object.keys(profile.publicationsByYear).sort();
  const maxPerYear = Math.max(1, ...Object.values(profile.publicationsByYear));

  const externalIds = [
    { label: 'ORCID', value: profile.orcid, href: `https://orcid.org/${profile.orcid}` },
    { label: 'Scopus', value: profile.scopusId, href: null },
    { label: 'SINTA', value: profile.sintaId, href: null },
    { label: 'Scholar', value: profile.scholarId, href: null },
  ].filter((x) => x.value);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/peneliti" className="text-sm text-indigo-600 hover:underline">
            {t.common.backToResearchers}
          </Link>
          <ThemeToggle />
          <LanguageToggle lang={lang} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-200">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-slate-900">
                {profile.fullName}
              </h1>
              <p className="text-sm text-indigo-700">{profile.unicalId}</p>
              <p className="mt-1 text-sm text-slate-600">
                {[
                  profile.department?.name,
                  profile.faculty?.name,
                  profile.institution,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <FollowButton
                unicalId={profile.unicalId}
                initialCount={profile.followerCount}
              />
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-slate-700">{profile.bio}</p>
          )}

          {profile.expertise.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {profile.expertise.map((e) => (
                <span
                  key={e}
                  className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {e}
                </span>
              ))}
            </div>
          )}

          {externalIds.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {externalIds.map((x) => (
                <span key={x.label} className="text-slate-600">
                  {x.label}:{' '}
                  {x.href ? (
                    <a
                      href={x.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {x.value}
                    </a>
                  ) : (
                    x.value
                  )}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={t.common.publications} value={profile.metrics.totalPublications} />
          <Metric label={t.profil.metricCitations} value={profile.metrics.totalCitations} />
          <Metric label="h-index" value={profile.metrics.hIndex} />
          <Metric label="i10-index" value={profile.metrics.i10Index} />
        </section>

        {years.length > 0 && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-slate-900">{t.profil.perYear}</h2>
            <div className="flex items-end gap-2">
              {years.map((year) => (
                <div key={year} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">
                    {profile.publicationsByYear[year]}
                  </span>
                  <div
                    className="w-full rounded-t bg-indigo-500"
                    style={{
                      height: `${(profile.publicationsByYear[year] / maxPerYear) * 72 + 8}px`,
                    }}
                  />
                  <span className="text-xs text-slate-600">{year}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {profile.citationTrend.length > 1 && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-slate-900">{t.profil.citationTrend}</h2>
            <TrendChart points={profile.citationTrend} />
            <p className="mt-2 text-xs text-slate-400">
              {t.profil.trendCaption}
            </p>
          </section>
        )}

        {profile.topCollaborators.length > 0 && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-slate-900">{t.profil.collaborators}</h2>
            <ul className="grid gap-1 sm:grid-cols-2">
              {profile.topCollaborators.map((c) => (
                <li
                  key={c.unicalId ?? c.name}
                  className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-slate-50"
                >
                  {c.unicalId ? (
                    <Link
                      href={`/profil/${c.unicalId}`}
                      className="truncate text-indigo-600 hover:underline"
                    >
                      {c.name}
                    </Link>
                  ) : (
                    <span className="truncate text-slate-700">{c.name}</span>
                  )}
                  <span className="ml-2 shrink-0 rounded bg-slate-100 px-1.5 text-xs text-slate-500">
                    {c.count} {t.common.works}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-4">
          <h2 className="mb-3 font-medium text-slate-900">
            {t.profil.publicationList} ({profile.publications.length})
          </h2>

          <div className="space-y-3">
            {profile.publications.length === 0 && (
              <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                {t.profil.noPublications}
              </p>
            )}

            {profile.publications.map((pub) => (
              <article
                key={pub.id}
                className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300"
              >
                <div className="mb-1 flex flex-wrap gap-1">
                  {pub.badges.map((b) => (
                    <span
                      key={b.code}
                      className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: b.badgeColor ?? '#64748b' }}
                    >
                      {b.name} {b.level}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/publikasi/${pub.id}`}
                  className="font-medium text-slate-900 hover:text-indigo-700"
                >
                  {pub.title}
                </Link>

                {pub.contributors.length > 0 && (
                  <p className="mt-1 text-sm text-slate-600">
                    {pub.contributors.map((c, i) => (
                      <span key={`${c.name}-${i}`}>
                        {c.unicalId ? (
                          <Link
                            href={`/profil/${c.unicalId}`}
                            className={
                              c.isOwner
                                ? 'font-semibold text-indigo-700'
                                : 'text-indigo-600 hover:underline'
                            }
                          >
                            {c.name}
                          </Link>
                        ) : (
                          c.name
                        )}
                        {i < pub.contributors.length - 1 && '; '}
                      </span>
                    ))}
                  </p>
                )}

                <p className="mt-1 text-xs text-slate-500">
                  {[
                    pub.journal,
                    pub.year,
                    `${pub.citationCount} ${t.common.citations}`,
                    pub.isCorresponding ? t.profil.corresponding : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
