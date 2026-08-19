import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { TrendChart } from '@/components/trend-chart';

export const revalidate = 600;

export const metadata = {
  title: 'Statistik Institusi · UNICAL ASSOCIATES REPO',
  description:
    'Statistik publikasi, sitasi, dan peneliti Universitas Muhammadiyah Makassar.',
};

interface Stats {
  totals: {
    publications: number;
    researchers: number;
    citations: number;
    journals: number;
  };
  publicationsByYear: { year: number; total: number }[];
  byFaculty: {
    id: string;
    faculty: string;
    researchers: number;
    publications: number;
    citations: number;
  }[];
  byType: { type: string; total: number }[];
  byQuartile: { quartile: string; total: number }[];
  topCited: {
    id: string;
    title: string;
    citationCount: number;
    year: number | null;
    journal: string | null;
  }[];
  citationTrend: { date: string; citations: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  JOURNAL_ARTICLE: 'Artikel Jurnal',
  PROCEEDING: 'Prosiding',
  BOOK_CHAPTER: 'Bab Buku',
  BOOK: 'Buku',
  PREPRINT: 'Preprint',
};

export default async function StatistikPage() {
  let stats: Stats | null = null;
  try {
    const body = await apiFetch<{ data: Stats }>('/stats');
    stats = body.data;
  } catch {
    stats = null;
  }

  if (!stats) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-slate-500">
        Statistik sedang tidak tersedia. Coba lagi sebentar lagi.
      </main>
    );
  }

  const maxYear = Math.max(1, ...stats.publicationsByYear.map((r) => r.total));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            ← Beranda
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Statistik Institusi
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Kinerja riset Universitas Muhammadiyah Makassar di UNICAL ASSOCIATES
          REPO.
        </p>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Big label="Publikasi" value={stats.totals.publications} />
          <Big label="Sitasi" value={stats.totals.citations} />
          <Big label="Peneliti" value={stats.totals.researchers} />
          <Big label="Jurnal" value={stats.totals.journals} />
        </section>

        {stats.publicationsByYear.length > 0 && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-slate-900">Publikasi per Tahun</h2>
            <div className="flex items-end gap-1 overflow-x-auto">
              {stats.publicationsByYear.map((row) => (
                <div
                  key={row.year}
                  className="flex min-w-8 flex-1 flex-col items-center gap-1"
                >
                  <span className="text-xs text-slate-500">{row.total}</span>
                  <div
                    className="w-full rounded-t bg-indigo-500"
                    style={{ height: `${(row.total / maxYear) * 90 + 6}px` }}
                  />
                  <span className="text-xs text-slate-600">{row.year}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {stats.citationTrend.length > 1 && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-slate-900">Tren Sitasi Institusi</h2>
            <TrendChart points={stats.citationTrend} />
          </section>
        )}

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-slate-900">Per Fakultas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3">Fakultas</th>
                  <th className="py-2 pr-3 text-right">Peneliti</th>
                  <th className="py-2 pr-3 text-right">Publikasi</th>
                  <th className="py-2 text-right">Sitasi</th>
                </tr>
              </thead>
              <tbody>
                {stats.byFaculty.map((row) => (
                  <tr key={row.faculty} className="border-b border-slate-100">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/statistik/fakultas/${row.id}`}
                        className="text-indigo-700 hover:underline"
                        title="Buka laporan kinerja fakultas"
                      >
                        {row.faculty}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-600">
                      {row.researchers}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-600">
                      {row.publications}
                    </td>
                    <td className="py-2 text-right text-slate-600">{row.citations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-slate-900">Jenis Publikasi</h2>
            <ul className="space-y-1 text-sm">
              {stats.byType.map((row) => (
                <li key={row.type} className="flex justify-between">
                  <span className="text-slate-700">
                    {TYPE_LABELS[row.type] ?? row.type}
                  </span>
                  <span className="text-slate-500">{row.total}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-medium text-slate-900">Kuartil Scopus</h2>
            <ul className="space-y-1 text-sm">
              {stats.byQuartile.map((row) => (
                <li key={row.quartile} className="flex justify-between">
                  <span className="text-slate-700">
                    {row.quartile === 'NONE' ? 'Belum terklasifikasi' : row.quartile}
                  </span>
                  <span className="text-slate-500">{row.total}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-slate-900">Paling Banyak Disitasi</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {stats.topCited.map((pub) => (
              <li key={pub.id}>
                <Link
                  href={`/publikasi/${pub.id}`}
                  className="text-indigo-700 hover:underline"
                >
                  {pub.title}
                </Link>
                <span className="text-slate-500">
                  {' '}
                  — {[pub.journal, pub.year, `${pub.citationCount} sitasi`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}

function Big({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
      <p className="text-3xl font-semibold text-slate-900">
        {value.toLocaleString('id-ID')}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
