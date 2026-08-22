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

      <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-5">
        <div className="grid gap-8 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Merek + deskripsi */}
          <div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-unical.png"
                alt="Logo UNICAL ASSOCIATES REPO"
                className="h-12 w-12 shrink-0 object-contain"
              />
              <div>
                <p className="font-extrabold tracking-tight text-slate-900">
                  UNICAL <span className="text-indigo-600">ASSOCIATES</span> REPO
                </p>
                <p className="text-[10px] tracking-widest text-slate-400 uppercase">
                  {t.landing.tagline}
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed">
              {t.landing.footerDesc}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {t.landing.featureOpen} · Open Access
            </p>
          </div>

          {/* Alamat */}
          <div className="text-[13px]">
            <p className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">
              {t.landing.footerAddress}
            </p>
            <address className="mt-3 leading-relaxed not-italic">
              Universitas Muhammadiyah Makassar
              <br />
              Jl. Sultan Alauddin No. 259
              <br />
              Makassar 90221, Sulawesi Selatan
            </address>
          </div>

          {/* Kontak */}
          <div className="text-[13px]">
            <p className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">
              {t.landing.footerContact}
            </p>
            <ul className="mt-3 space-y-1.5">
              <li>
                <a
                  href="mailto:unical.assoc.repo@gmail.com"
                  className="break-all transition hover:text-indigo-700"
                >
                  unical.assoc.repo@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://unismuh.ac.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-indigo-700"
                >
                  unismuh.ac.id
                </a>
              </li>
            </ul>
          </div>

          {/* Sumber data */}
          <div className="text-[13px]">
            <p className="text-[11px] font-bold tracking-widest text-slate-900 uppercase">
              {t.landing.footerSources}
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                ['CrossRef', 'https://www.crossref.org'],
                ['DataCite', 'https://datacite.org'],
                ['OpenAlex', 'https://openalex.org'],
                ['ORCID', 'https://orcid.org'],
                ['Google Scholar', 'https://scholar.google.com'],
              ].map(([name, href]) => (
                <li key={name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-indigo-700"
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bar bawah */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-4 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} UNICAL ASSOCIATES ·{' '}
            {t.landing.footerManaged}
          </p>
          <p className="flex items-center gap-3">
            <a
              href="/.well-known/security.txt"
              className="transition hover:text-indigo-700"
            >
              security.txt
            </a>
            <span aria-hidden>·</span>
            {t.landing.footerRights}
          </p>
        </div>
      </div>
    </footer>
  );
}
