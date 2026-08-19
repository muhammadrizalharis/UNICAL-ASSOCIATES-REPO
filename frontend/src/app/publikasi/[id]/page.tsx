import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface PublicationDetail {
  id: string;
  doi: string;
  title: string;
  abstract: string | null;
  journal: {
    name: string | null;
    publisher: string | null;
    issn: string | null;
  } | null;
  authors: {
    name: string;
    order: number;
    isCorresponding: boolean;
    affiliation: string | null;
  }[];
  categories: { id: string; name: string }[];
  badges: { code: string; name: string; level: string | null; color: string | null }[];
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publishedDate: string | null;
  keywords: string[];
  url: string | null;
  citationCount: number;
  viewCount: number;
}

async function loadPublication(id: string): Promise<PublicationDetail | null> {
  try {
    const body = await apiFetch<{ data: PublicationDetail }>(`/publications/${id}`);
    return body.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pub = await loadPublication(id);
  if (!pub) return { title: 'Publikasi tidak ditemukan' };

  // Meta Highwire Press agar terbaca Google Scholar. Tanggal harus
  // berformat YYYY/MM/DD, bukan cap waktu ISO penuh.
  return {
    title: `${pub.title} · UNICAL ASSOCIATES REPO`,
    description: pub.abstract?.slice(0, 160),
    other: {
      citation_title: pub.title,
      citation_author: pub.authors.map((a) => a.name),
      citation_journal_title: pub.journal?.name ?? '',
      citation_publication_date:
        pub.publishedDate?.slice(0, 10).replace(/-/g, '/') ?? '',
      citation_volume: pub.volume ?? '',
      citation_issue: pub.issue ?? '',
      citation_doi: pub.doi,
    },
  };
}

export default async function PublicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pub = await loadPublication(id);
  if (!pub) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <Link href="/publikasi" className="text-sm text-indigo-600 hover:underline">
            ← Jelajahi Publikasi
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-2 flex flex-wrap gap-1">
          {pub.badges.map((b) => (
            <span
              key={b.code}
              className="rounded px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: b.color ?? '#64748b' }}
            >
              {b.name} {b.level}
            </span>
          ))}
        </div>

        <h1 className="text-2xl font-semibold text-slate-900">{pub.title}</h1>

        <p className="mt-2 text-sm text-slate-700">
          {pub.authors.map((a) => (
            <span key={a.order}>
              {a.name}
              {a.isCorresponding && <sup title="Corresponding author">✱</sup>}
              {a.order < pub.authors.length && ', '}
            </span>
          ))}
        </p>

        {pub.journal && (
          <p className="mt-1 text-sm text-slate-600">
            {[
              pub.journal.name,
              pub.journal.publisher,
              pub.volume && `Vol ${pub.volume}`,
              pub.issue && `No ${pub.issue}`,
              pub.pages,
              pub.publishedDate?.slice(0, 4),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <a
            href={`https://doi.org/${pub.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            DOI: {pub.doi} ↗
          </a>
          <span className="text-slate-500">{pub.citationCount} sitasi</span>
          <span className="text-slate-500">{pub.viewCount} dilihat</span>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-2 font-medium text-slate-900">Abstrak</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {pub.abstract ?? 'Abstrak tidak tersedia untuk publikasi ini.'}
          </p>
        </section>

        {(pub.keywords.length > 0 || pub.categories.length > 0) && (
          <section className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-5">
            {pub.categories.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Bidang ilmu</p>
                <div className="flex flex-wrap gap-1">
                  {pub.categories.map((c) => (
                    <span
                      key={c.id}
                      className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {pub.keywords.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Kata kunci</p>
                <div className="flex flex-wrap gap-1">
                  {pub.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
