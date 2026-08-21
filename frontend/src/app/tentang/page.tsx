import { dict, getLang } from '@/lib/i18n';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Reveal } from '@/components/reveal';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tentang · UNICAL ASSOCIATES REPO',
  description:
    'Tentang UNICAL ASSOCIATES REPO — repositori publikasi ilmiah resmi Universitas Muhammadiyah Makassar.',
};

export default async function TentangPage() {
  const lang = await getLang();
  const t = dict(lang);

  const sections = [
    { icon: '📚', title: t.tentang.aboutTitle, body: t.tentang.aboutBody },
    { icon: '🆔', title: t.tentang.idTitle, body: t.tentang.idBody },
    { icon: '📊', title: t.tentang.dataTitle, body: t.tentang.dataBody },
    { icon: '🔓', title: t.tentang.openTitle, body: t.tentang.openBody },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader lang={lang} />

      <main className="mx-auto max-w-4xl px-4 py-10">
        <Reveal>
          <p className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
            {t.landing.tagline}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {t.tentang.title}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">{t.tentang.subtitle}</p>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sections.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className="h-full">
              <section className="h-full rounded-xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg">
                <p className="text-2xl" aria-hidden>
                  {s.icon}
                </p>
                <h2 className="mt-2 font-bold text-slate-900">{s.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {s.body}
                </p>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-bold text-slate-900">{t.tentang.teamTitle}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {t.tentang.teamBody}
            </p>
            <h2 className="mt-5 font-bold text-slate-900">
              {t.tentang.contactTitle}
            </h2>
            <ul className="mt-1.5 space-y-1 text-sm text-slate-600">
              <li>
                ✉{' '}
                <a
                  href="mailto:unical.assoc.repo@gmail.com"
                  className="text-indigo-600 hover:underline"
                >
                  unical.assoc.repo@gmail.com
                </a>
              </li>
              <li>
                🌐{' '}
                <a
                  href="https://unismuh.ac.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  unismuh.ac.id
                </a>
              </li>
              <li>📍 Jl. Sultan Alauddin No. 259, Makassar 90221, Sulawesi Selatan</li>
            </ul>
          </section>
        </Reveal>
      </main>

      <SiteFooter lang={lang} />
    </div>
  );
}
