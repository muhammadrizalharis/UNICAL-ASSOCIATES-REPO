import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Direktori Peneliti · UNICAL ASSOCIATES REPO' };

interface ResearcherRow {
  unicalId: string;
  fullName: string;
  photoUrl: string | null;
  hIndex: number;
  totalCitations: number;
  faculty: { name: string } | null;
  department: { name: string } | null;
  _count: { authorships: number };
}

interface DirectoryResponse {
  data: ResearcherRow[];
  meta: { page: number; total: number; lastPage: number };
}

export default async function PenelitiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page) params.set('page', page);

  let result: DirectoryResponse | null = null;
  try {
    result = await apiFetch<DirectoryResponse>(`/researchers?${params}`);
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
            <Link href="/publikasi" className="text-slate-600 hover:text-indigo-700">
              Publikasi
            </Link>
            <Link href="/welcome" className="text-slate-600 hover:text-indigo-700">
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Direktori Peneliti</h1>
        <p className="mt-1 text-sm text-slate-600">
          Peneliti yang UNICAL ID-nya sudah diterbitkan.
        </p>

        <form className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Cari nama peneliti…"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Cari
          </button>
        </form>

        {!result && (
          <p className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Tidak dapat memuat direktori peneliti.
          </p>
        )}

        {result && (
          <>
            <p className="mt-4 text-sm text-slate-600">{result.meta.total} peneliti</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {result.data.length === 0 && (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 sm:col-span-2">
                  Belum ada peneliti yang cocok.
                </p>
              )}

              {result.data.map((row) => (
                <Link
                  key={row.unicalId}
                  href={`/profil/${row.unicalId}`}
                  className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                    {row.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{row.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{row.unicalId}</p>
                    <p className="truncate text-xs text-slate-600">
                      {[row.department?.name, row.faculty?.name]
                        .filter(Boolean)
                        .join(' · ') || 'Afiliasi belum diisi'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row._count.authorships} publikasi · {row.totalCitations} sitasi ·
                      h-index {row.hIndex}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
