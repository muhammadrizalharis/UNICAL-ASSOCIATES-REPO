'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader } from '@/lib/session';
import { RequireAuth, TopBar } from '@/components/require-auth';

export default function AkunPage() {
  return (
    <RequireAuth>
      {(user) => (
        <div className="min-h-screen bg-slate-50">
          <TopBar user={user} />

          <main className="mx-auto max-w-md px-4 py-8">
            <Link href="/dashboard/profil" className="text-sm text-indigo-600 hover:underline">
              ← Profil
            </Link>

            <h1 className="mt-3 text-2xl font-semibold text-slate-900">
              Pengaturan Akun
            </h1>
            <p className="mt-1 text-sm text-slate-600">{user.email}</p>

            <ChangePasswordCard />
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
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
      await apiFetch('/auth/password', {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Gagal mengubah kata sandi.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-slate-900">Ubah Kata Sandi</h2>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-xs text-indigo-600 hover:underline"
        >
          {show ? 'Sembunyikan' : 'Tampilkan'}
        </button>
      </div>

      <Field
        id="current"
        label="Kata sandi saat ini"
        value={current}
        onChange={setCurrent}
        show={show}
      />
      <Field
        id="next"
        label="Kata sandi baru (minimal 12 karakter)"
        value={next}
        onChange={setNext}
        show={show}
      />
      <Field
        id="confirm"
        label="Ulangi kata sandi baru"
        value={confirm}
        onChange={setConfirm}
        show={show}
      />

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Kata sandi berhasil diubah. Gunakan kata sandi baru pada login berikutnya.
        </p>
      )}

      <button
        type="submit"
        disabled={busy || next.length < 12 || !current}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? 'Menyimpan…' : 'Simpan Kata Sandi Baru'}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  show,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required
        autoComplete={id === 'current' ? 'current-password' : 'new-password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}
