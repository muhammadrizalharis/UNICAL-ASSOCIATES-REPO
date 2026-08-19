'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader } from '@/lib/session';
import { RequireAuth, TopBar } from '@/components/require-auth';

interface SessionRow {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
}

export default function KeamananPage() {
  return (
    <RequireAuth>
      {(user) => (
        <div className="min-h-screen bg-slate-50">
          <TopBar user={user} />

          <main className="mx-auto max-w-2xl px-4 py-8">
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">Keamanan</h1>
            <p className="mt-1 text-sm text-slate-600">
              Kelola perangkat yang login dan autentikasi dua faktor.
            </p>

            <TotpCard />
            <SessionsCard />
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

function TotpCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{
    secret: string;
    otpauth: string;
    qrDataUrl: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ data: { totpEnabled: boolean } }>('/auth/me', {
      headers: authHeader(),
    })
      .then((res) => setEnabled(res.data.totpEnabled))
      .catch(() => setEnabled(false));
  }, []);

  async function beginSetup() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiFetch<{
        data: { secret: string; otpauth: string; qrDataUrl: string };
      }>('/auth/totp/setup', { method: 'POST', headers: authHeader() });
      setSetup(res.data);
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'Setup gagal.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm(action: 'enable' | 'disable') {
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/auth/totp/${action}`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ code }),
      });
      setEnabled(action === 'enable');
      setSetup(null);
      setCode('');
      setMessage(
        action === 'enable'
          ? '2FA aktif. Kode autentikator kini diminta setiap login.'
          : '2FA dinonaktifkan.',
      );
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'Kode salah.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-medium text-slate-900">
        Autentikasi Dua Faktor (2FA){' '}
        {enabled !== null && (
          <span
            className={
              enabled
                ? 'ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700'
                : 'ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500'
            }
          >
            {enabled ? 'AKTIF' : 'NONAKTIF'}
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Lindungi akun dengan kode 6 digit dari aplikasi autentikator
        (Google Authenticator, Aegis, dan sejenisnya).
      </p>

      {enabled === false && !setup && (
        <button
          disabled={busy}
          onClick={() => void beginSetup()}
          className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Aktifkan 2FA
        </button>
      )}

      {setup && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            1. Pindai QR ini dengan aplikasi autentikator:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qrDataUrl} alt="QR 2FA" className="mt-2 h-44 w-44" />
          <p className="mt-2 text-xs text-slate-500">
            Atau masukkan kunci manual: <code className="select-all">{setup.secret}</code>
          </p>
          <p className="mt-3 text-sm text-slate-700">2. Masukkan kode 6 digit:</p>
          <div className="mt-1 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="w-28 rounded-md border border-slate-300 px-3 py-1.5 text-center tracking-widest outline-none focus:border-indigo-500"
            />
            <button
              disabled={busy || code.length !== 6}
              onClick={() => void confirm('enable')}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Verifikasi & Aktifkan
            </button>
          </div>
        </div>
      )}

      {enabled === true && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="Kode 6 digit"
            className="w-32 rounded-md border border-slate-300 px-3 py-1.5 text-center outline-none focus:border-indigo-500"
          />
          <button
            disabled={busy || code.length !== 6}
            onClick={() => void confirm('disable')}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Nonaktifkan 2FA
          </button>
        </div>
      )}

      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </section>
  );
}

function SessionsCard() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ data: SessionRow[] }>('/auth/sessions', {
        headers: authHeader(),
      });
      setSessions(res.data);
    } catch {
      setSessions([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function revoke(id: string) {
    try {
      await apiFetch(`/auth/sessions/${id}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      setMessage('Sesi dicabut. Perangkat itu harus login ulang.');
      await load();
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'Gagal mencabut.');
    }
  }

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-medium text-slate-900">Perangkat yang Login</h2>
      <ul className="mt-3 space-y-2">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-700">
                {s.userAgent ?? 'Perangkat tidak dikenal'}
              </p>
              <p className="text-xs text-slate-400">
                {s.ipAddress ?? '-'} · aktif{' '}
                {new Date(s.lastSeenAt).toLocaleString('id-ID')}
                {s.current && (
                  <span className="ml-1 rounded bg-indigo-100 px-1.5 text-indigo-700">
                    sesi ini
                  </span>
                )}
              </p>
            </div>
            {!s.current && (
              <button
                onClick={() => void revoke(s.id)}
                className="shrink-0 rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Cabut
              </button>
            )}
          </li>
        ))}
        {sessions.length === 0 && (
          <li className="text-sm text-slate-500">Tidak ada sesi aktif lain.</li>
        )}
      </ul>
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </section>
  );
}
