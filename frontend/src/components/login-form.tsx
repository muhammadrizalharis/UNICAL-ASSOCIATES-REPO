'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { saveSession, type SessionUser } from '@/lib/session';

interface LoginResponse {
  data: {
    token: string;
    user: SessionUser;
    homePath: string;
    nextStep: string | null;
  };
}

/** `gate` berasal dari segmen URL; kosong berarti pintu masuk anggota biasa. */
export function LoginForm({ gate }: { gate?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isStaffGate = Boolean(gate);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe, gate }),
      });

      saveSession(body.data.token, body.data.user);
      router.push(
        body.data.nextStep === 'affiliation'
          ? '/daftar/afiliasi'
          : body.data.homePath,
      );
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : 'Tidak dapat terhubung ke server.',
      );
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isStaffGate && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Pintu masuk pengelola. Akun anggota biasa tidak dapat masuk dari sini.
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Kata sandi
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-xs text-indigo-600 hover:underline"
          >
            {showPassword ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
        />
        Biarkan saya tetap masuk
      </label>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? 'Memproses…' : 'Masuk'}
      </button>

      {!isStaffGate && (
        <p className="text-center text-sm text-slate-600">
          Belum punya akun?{' '}
          <Link href="/daftar" className="font-medium text-indigo-600 hover:underline">
            Daftar
          </Link>
        </p>
      )}
    </form>
  );
}
