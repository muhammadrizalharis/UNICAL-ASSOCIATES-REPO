'use client';

import { useRouter } from 'next/navigation';

/** Sakelar bahasa ID/EN; pilihan disimpan di cookie setahun. */
export function LanguageToggle({ lang }: { lang: 'id' | 'en' }) {
  const router = useRouter();

  function switchTo(next: 'id' | 'en') {
    if (next === lang) return;
    document.cookie = `unical.lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div
      className="flex overflow-hidden rounded-md border border-slate-300 text-xs font-semibold"
      role="group"
      aria-label="Pilih bahasa"
    >
      {(['id', 'en'] as const).map((code) => (
        <button
          key={code}
          onClick={() => switchTo(code)}
          aria-pressed={lang === code}
          className={
            lang === code
              ? 'bg-indigo-600 px-2 py-1 text-white'
              : 'bg-white px-2 py-1 text-slate-600 hover:bg-slate-50'
          }
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
