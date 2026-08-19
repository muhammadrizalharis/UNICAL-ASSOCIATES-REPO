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
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold tracking-tight text-indigo-700">
            UNICAL ASSOCIATES REPO
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Unismuh Catalog of Academic Literature
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-slate-600">{subtitle}</p>
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Universitas Muhammadiyah Makassar
        </p>
      </div>
    </main>
  );
}
