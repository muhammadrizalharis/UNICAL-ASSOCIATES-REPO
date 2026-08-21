import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';

interface FacultyReport {
  faculty: { id: string; code: string; name: string };
  researchers: {
    unicalId: string | null;
    fullName: string;
    department: string | null;
    publications: number;
    citations: number;
    hIndex: number;
    i10Index: number;
  }[];
  generatedAt: string;
}

export default async function LaporanFakultasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let report: FacultyReport | null = null;
  try {
    const body = await apiFetch<{ data: FacultyReport }>(`/stats/faculties/${id}`);
    report = body.data;
  } catch {
    report = null;
  }
  if (!report) notFound();

  const totals = report.researchers.reduce(
    (acc, r) => ({
      publications: acc.publications + r.publications,
      citations: acc.citations + r.citations,
    }),
    { publications: 0, citations: 0 },
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/statistik" className="text-sm text-indigo-600 hover:underline">
            ← Statistik Institusi
          </Link>
          <PrintButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="text-center">
          <p className="text-xs tracking-widest text-slate-500 uppercase">
            Laporan Kinerja Riset
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {report.faculty.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Universitas Muhammadiyah Makassar · UNICAL ASSOCIATES REPO
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Dibuat {new Date(report.generatedAt).toLocaleString('id-ID')}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-2xl font-semibold text-slate-900">
              {report.researchers.length}
            </p>
            <p className="text-xs text-slate-500">Peneliti terverifikasi</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-2xl font-semibold text-slate-900">
              {totals.publications}
            </p>
            <p className="text-xs text-slate-500">Kepenulisan</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-2xl font-semibold text-slate-900">{totals.citations}</p>
            <p className="text-xs text-slate-500">Sitasi</p>
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left text-xs text-slate-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Peneliti</th>
              <th className="py-2 pr-2">Program Studi</th>
              <th className="py-2 pr-2 text-right">Publikasi</th>
              <th className="py-2 pr-2 text-right">Sitasi</th>
              <th className="py-2 pr-2 text-right">h</th>
              <th className="py-2 text-right">i10</th>
            </tr>
          </thead>
          <tbody>
            {report.researchers.map((r, i) => (
              <tr key={r.unicalId ?? r.fullName} className="border-b border-slate-100">
                <td className="py-2 pr-2 text-slate-400">{i + 1}</td>
                <td className="py-2 pr-2">
                  {r.unicalId ? (
                    <Link
                      href={`/profil/${r.unicalId}`}
                      className="text-indigo-700 hover:underline print:text-slate-900"
                    >
                      {r.fullName}
                    </Link>
                  ) : (
                    r.fullName
                  )}
                </td>
                <td className="py-2 pr-2 text-slate-600">{r.department ?? '-'}</td>
                <td className="py-2 pr-2 text-right">{r.publications}</td>
                <td className="py-2 pr-2 text-right">{r.citations}</td>
                <td className="py-2 pr-2 text-right">{r.hIndex}</td>
                <td className="py-2 text-right">{r.i10Index}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-8 text-center text-xs text-slate-400 print:mt-12">
          Sumber data: UNICAL ASSOCIATES REPO — metrik dihitung dari publikasi
          terverifikasi dan pembaruan sitasi OpenAlex.
        </p>
      </main>
    </div>
  );
}
