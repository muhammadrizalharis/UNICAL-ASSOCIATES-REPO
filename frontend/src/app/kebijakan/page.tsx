import Link from 'next/link';
import { dict, getLang } from '@/lib/i18n';
import { ReportForm } from '@/components/report-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export const metadata = {
  title: 'Kebijakan & Pelaporan · UNICAL ASSOCIATES REPO',
  description:
    'Kebijakan hak cipta, prosedur takedown, dan pelaporan penyalahgunaan.',
};

export default async function KebijakanPage() {
  const lang = await getLang();
  const t = dict(lang);
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader lang={lang} />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Kebijakan & Pelaporan
        </h1>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-slate-900">Hak Cipta & Takedown</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
            <p>
              UNICAL ASSOCIATES REPO menampilkan metadata publikasi (judul,
              penulis, abstrak, DOI) dari sumber terbuka seperti CrossRef,
              DataCite, dan OpenAlex. Berkas PDF hanya diunggah untuk artikel
              yang berlisensi akses terbuka atau yang haknya dipegang penulis.
            </p>
            <p>
              Bila Anda pemegang hak cipta dan menemukan konten yang melanggar
              hak Anda, ajukan permintaan takedown melalui formulir di bawah.
              Sertakan tautan publikasi, bukti kepemilikan hak, dan kontak yang
              bisa dihubungi. Tim moderasi meninjau permintaan takedown dalam
              3×24 jam kerja; konten yang terbukti melanggar akan dicabut.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-slate-900">Pelaporan Penyalahgunaan</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Laporkan klaim kepenulisan palsu, komentar yang melecehkan, spam,
            atau penyalahgunaan lain. Laporan dapat diajukan tanpa akun; kami
            hanya membutuhkan email untuk tindak lanjut.
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-slate-900">Formulir Laporan</h2>
          <ReportForm />
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <h2 className="font-medium text-slate-900">Keamanan</h2>
          <p className="mt-2">
            Menemukan celah keamanan? Hubungi kami secara bertanggung jawab
            melalui alamat pada{' '}
            <a
              href="/.well-known/security.txt"
              className="text-indigo-600 hover:underline"
            >
              security.txt
            </a>
            . Mohon tidak mengeksploitasi celah atau mengakses data pengguna
            lain.
          </p>
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}
