/** Kerangka saat hasil pencarian dimuat. */
export default function LoadingPublikasi() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto h-14 max-w-5xl px-4" />
      </div>
      <main className="mx-auto max-w-5xl animate-pulse px-4 py-8">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="mt-4 flex gap-2">
          <div className="h-11 flex-1 rounded-md bg-slate-200" />
          <div className="h-11 w-56 rounded-md bg-slate-200" />
          <div className="h-11 w-20 rounded-md bg-slate-300" />
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 rounded bg-slate-200" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-white shadow-sm" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
