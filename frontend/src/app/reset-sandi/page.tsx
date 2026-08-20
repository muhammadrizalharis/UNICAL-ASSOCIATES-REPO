'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { AuthShell } from '@/components/auth-shell';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (next !== confirm) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }

    setBusy(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: next }),
      });
      setDone(true);
      setTimeout(() => router.push('/masuk'), 2200);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Reset gagal diproses.',
      );
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        Tautan tidak lengkap. Minta tautan reset baru kepada super admin.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-xs text-indigo-600 hover:underline"
        >
          {show ? 'Sembunyikan' : 'Tampilkan'}
        </button>
      </div>

      <div>
        <label htmlFor="next" className="block text-sm font-medium text-slate-700">
          Kata sandi baru (minimal 12 karakter)
        </label>
        <input
          id="next"
          type={show ? 'text' : 'password'}
          required
          minLength={12}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
          Ulangi kata sandi baru
        </label>
        <input
          id="confirm"
          type={show ? 'text' : 'password'}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Kata sandi berhasil direset. Mengalihkan ke halaman masuk…
        </p>
      )}

      <button
        type="submit"
        disabled={busy || next.length < 12}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? 'Memproses…' : 'Setel Kata Sandi Baru'}
      </button>
    </form>
  );
}

export default function ResetSandiPage() {
  return (
    <AuthShell
      title="Reset Kata Sandi"
      subtitle="Tautan ini diterbitkan super admin dan berlaku 1 jam."
    >
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
