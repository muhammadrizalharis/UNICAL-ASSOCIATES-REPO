'use client';

import { useEffect, useState } from 'react';

const KEY = 'unical.theme';

/** Sakelar terang/gelap; preferensi tersimpan di localStorage. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
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
      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-sm transition hover:border-indigo-400"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
