'use client';

import { useEffect, useState } from 'react';

const KEY = 'unical.theme';

/** Sakelar terang/gelap; preferensi tersimpan di localStorage. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      // Penyimpanan bisa diblokir (mode privat); tema tetap berlaku sesesi.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={dark ? 'Mode terang' : 'Mode gelap'}
      className="group relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-300 text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600"
    >
      {/* Matahari */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={`absolute h-4.5 w-4.5 transition-all duration-500 ${
          ready && dark
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        }`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      {/* Bulan */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute h-4.5 w-4.5 transition-all duration-500 ${
          ready && dark
            ? '-rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }`}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
