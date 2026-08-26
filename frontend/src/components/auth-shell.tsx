import Link from 'next/link';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/welcome"
          aria-label="Ke beranda UNICAL ASSOCIATES REPO"
          className="group mb-8 flex flex-col items-center gap-2 text-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-unical.png"
            alt="Logo UNICAL ASSOCIATES REPO"
            className="h-12 w-12 object-contain"
          />
          <span>
            <span className="block text-2xl font-bold tracking-tight text-indigo-700 transition group-hover:text-indigo-600">
              UNICAL ASSOCIATES REPO
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Unismuh Catalog of Academic Literature
            </span>
          </span>
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-slate-600">{subtitle}</p>
          {children}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-slate-400">
          <Link
            href="/welcome"
            className="inline-flex items-center gap-1 font-medium text-indigo-600 transition hover:underline"
          >
            ← Kembali ke beranda
          </Link>
          <span aria-hidden>·</span>
          <span>Universitas Muhammadiyah Makassar</span>
        </div>
      </div>
    </main>
  );
}
