'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { saveSession, type SessionUser } from '@/lib/session';
import { AuthShell } from '@/components/auth-shell';

interface RegisterResponse {
  data: { token: string; user: SessionUser; nextStep: string | null };
}

export default function DaftarPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    country: 'ID',
    email: '',
    password: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...form, acceptTerms }),
      });

      saveSession(body.data.token, body.data.user);
      router.push('/daftar/afiliasi');
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
    <AuthShell
      title="Bergabung dengan UNICAL"
      subtitle="Himpun publikasi Anda, tampilkan rekam jejak riset, dan temukan kolega sebidang."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="firstName"
            label="Nama depan"
            value={form.firstName}
            onChange={(v) => update('firstName', v)}
            required
          />
          <Field
            id="lastName"
            label="Nama belakang"
            value={form.lastName}
            onChange={(v) => update('lastName', v)}
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-slate-700">
            Negara
          </label>
          <select
            id="country"
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="ID">Indonesia</option>
            <option value="MY">Malaysia</option>
            <option value="SG">Singapura</option>
            <option value="AU">Australia</option>
            <option value="GB">Britania Raya</option>
            <option value="US">Amerika Serikat</option>
          </select>
        </div>

        <Field
          id="email"
          label="Email institusi"
          type="email"
          value={form.email}
          onChange={(v) => update('email', v)}
          required
          hint="Diutamakan email berdomain unismuh.ac.id"
        />

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
            minLength={12}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <p className="mt-1 text-xs text-slate-500">Minimal 12 karakter.</p>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <span>
            Saya menyetujui Syarat Layanan dan Kebijakan Privasi UNICAL.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !acceptTerms}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Memproses…' : 'Lanjutkan'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Sudah punya akun?{' '}
          <Link href="/masuk" className="font-medium text-indigo-600 hover:underline">
            Masuk
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
