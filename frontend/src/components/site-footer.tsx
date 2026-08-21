import Link from 'next/link';
import { dict, type Lang } from '@/lib/i18n';

/**
 * Footer institusional — terang dan formal; kelas semantik membuatnya
 * otomatis menyesuaikan saat pengguna memilih mode gelap.
 */
export function SiteFooter({ lang }: { lang: Lang }) {
  const t = dict(lang);

  return (
    <footer className="relative overflow-hidden border-t border-slate-200 bg-white text-slate-600">
      {/* Garis aksen khas merek */}
      <div
        className="h-1 w-full bg-gradient-to-r from-[#4f46e5] via-[#8b5cf6] to-[#4f46e5]"
        aria-hidden
      />
      <div className="bg-dots absolute inset-0 opacity-30" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Merek + deskripsi */}
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-xl font-extrabold text-[#f8fafc] shadow-lg shadow-indigo-200">
                U
              </span>
              <div>
                <p className="font-extrabold tracking-tight text-slate-900">
                  UNICAL <span className="text-indigo-600">ASSOCIATES</span> REPO
                </p>
                <p className="text-[11px] tracking-widest text-slate-400 uppercase">
                  {t.landing.tagline}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed">{t.landing.footerDesc}</p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {t.landing.featureOpen} · Open Access
            </p>
          </div>

          {/* Navigasi repositori */}
          <nav aria-label={t.landing.footerRepo}>
            <p className="text-xs font-bold tracking-widest text-slate-900 uppercase">
              {t.landing.footerRepo}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <FooterLink href="/publikasi">{t.common.publications}</FooterLink>
              <FooterLink href="/peneliti">{t.common.researchers}</FooterLink>
              <FooterLink href="/statistik">{t.landing.footerStats}</FooterLink>
            </ul>
          </nav>

          {/* Layanan + ketentuan */}
          <nav aria-label={t.landing.footerServices}>
            <p className="text-xs font-bold tracking-widest text-slate-900 uppercase">
              {t.landing.footerServices}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <FooterLink href="/masuk">{t.landing.ctaLogin}</FooterLink>
              <FooterLink href="/daftar">{t.landing.ctaRegister}</FooterLink>
              <li>
                <a href="/api/docs" className="transition hover:text-indigo-700">
                  {t.landing.footerApi}
                </a>
              </li>
              <FooterLink href="/kebijakan">{t.landing.footerPolicy}</FooterLink>
              <li>
                <a
                  href="/.well-known/security.txt"
                  className="transition hover:text-indigo-700"
                >
                  security.txt
                </a>
              </li>
            </ul>
          </nav>

          {/* Alamat + kontak resmi */}
          <div className="text-sm">
            <p className="text-xs font-bold tracking-widest text-slate-900 uppercase">
              {t.landing.footerAddress}
            </p>
            <address className="mt-4 leading-relaxed not-italic">
              Universitas Muhammadiyah Makassar
              <br />
              Jl. Sultan Alauddin No. 259
              <br />
              Makassar 90221, Sulawesi Selatan
            </address>
            <p className="mt-5 text-xs font-bold tracking-widest text-slate-900 uppercase">
              {t.landing.footerContact}
            </p>
            <ul className="mt-3 space-y-1.5">
              <li>
                <a
                  href="mailto:unical.assoc.repo@gmail.com"
                  className="transition hover:text-indigo-700"
                >
                  ✉ unical.assoc.repo@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://unismuh.ac.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-indigo-700"
                >
                  🌐 unismuh.ac.id
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Strip sumber data */}
        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-center text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            {t.landing.footerSources}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {[
              ['CrossRef', 'https://www.crossref.org'],
              ['DataCite', 'https://datacite.org'],
              ['OpenAlex', 'https://openalex.org'],
              ['ORCID', 'https://orcid.org'],
              ['Google Scholar', 'https://scholar.google.com'],
            ].map(([name, href]) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:text-indigo-700 hover:shadow-sm"
              >
                {name}
              </a>
            ))}
          </div>
        </div>

        {/* Bar bawah */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-5 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} UNICAL ASSOCIATES ·{' '}
            {t.landing.footerManaged}
          </p>
          <p>{t.landing.footerRights}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="transition hover:text-indigo-700">
        {children}
      </Link>
    </li>
  );
}
