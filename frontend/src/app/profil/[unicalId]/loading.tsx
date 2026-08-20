/** Kerangka saat profil peneliti dimuat. */
export default function LoadingProfil() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto h-12 max-w-3xl px-4" />
      </div>
      <main className="mx-auto max-w-3xl animate-pulse px-4 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-2/3 rounded bg-slate-200" />
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-white shadow-sm" />
          ))}
        </div>
        <div className="mt-4 h-40 rounded-lg bg-white shadow-sm" />
        <div className="mt-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-white shadow-sm" />
          ))}
        </div>
      </main>
    </div>
  );
}
