import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jelajahi Publikasi · UNICAL ASSOCIATES REPO' };

interface PublicationRow {
  id: string;
  doi: string;
  title: string;
  journal: { name: string | null } | null;
  authors: { name: string; order: number }[];
  badges: { code: string; name: string; level: string | null; color: string | null }[];
  publishedDate: string | null;
  citationCount: number;
  viewCount: number;
}

interface ListResponse {
  data: PublicationRow[];
  meta: { page: number; total: number; lastPage: number };
}

export default async function PublikasiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page) params.set('page', page);

  let result: ListResponse | null = null;
  try {
    result = await apiFetch<ListResponse>(`/publications?${params}`);
  } catch {
    result = null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-bold text-indigo-700">
            UNICAL ASSOCIATES REPO
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/peneliti" className="text-slate-600 hover:text-indigo-700">
              Peneliti
            </Link>
            <Link
              href="/welcome"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Jelajahi Publikasi</h1>

        <form className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Cari judul atau abstrak…"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Cari
          </button>
        </form>

        {!result && (
          <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Tidak dapat memuat daftar publikasi.
          </p>
        )}

        {result && (
          <>
            <p className="mt-4 text-sm text-slate-600">
              {result.meta.total} publikasi terverifikasi
            </p>

            <div className="mt-4 space-y-3">
              {result.data.length === 0 && (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada publikasi yang cocok.
                </p>
              )}

              {result.data.map((row) => (
                <article
                  key={row.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300"
                >
                  <div className="mb-1 flex flex-wrap gap-1">
                    {row.badges.map((b) => (
                      <span
                        key={b.code}
                        className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: b.color ?? '#64748b' }}
                      >
                        {b.name} {b.level}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/publikasi/${row.id}`}
                    className="font-medium text-slate-900 hover:text-indigo-700"
                  >
                    {row.title}
                  </Link>

                  <p className="mt-1 text-sm text-slate-600">
                    {row.authors
                      .slice(0, 4)
                      .map((a) => a.name)
                      .join(', ')}
                    {row.authors.length > 4 && ` +${row.authors.length - 4} lainnya`}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      row.journal?.name,
                      row.publishedDate?.slice(0, 4),
                      `${row.citationCount} sitasi`,
                      `${row.viewCount} dilihat`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
