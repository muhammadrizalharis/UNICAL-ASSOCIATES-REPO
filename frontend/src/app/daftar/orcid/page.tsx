'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader, readToken, saveSession, type SessionUser } from '@/lib/session';
import { AuthShell } from '@/components/auth-shell';

interface LinkResult {
  data: {
    orcid: string;
    works: { total: number; items: { status: string }[] };
  };
}

export default function TautkanOrcidPage() {
  const router = useRouter();
  const [orcid, setOrcid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const valid = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid.trim());

  async function refreshSession() {
    const token = readToken();
    if (!token) return;
    const me = await apiFetch<{ data: SessionUser }>('/auth/me', {
      headers: authHeader(),
    });
    saveSession(token, me.data);
  }

  async function link() {
    setBusy(true);
    setError(null);

    try {
      const body = await apiFetch<LinkResult>('/researchers/me/orcid', {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify({ orcid: orcid.trim() }),
      });

      const imported = body.data.works.items.filter(
        (i) => i.status === 'imported' || i.status === 'linked',
      ).length;
      setSummary(
        `ORCID ${body.data.orcid} tertaut. ${imported} dari ${body.data.works.total} karya tersinkron ke profil Anda.`,
      );

      await refreshSession();
      setTimeout(() => router.push('/dashboard'), 2200);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Gagal menautkan ORCID.',
      );
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    try {
      await apiFetch('/researchers/me/orcid/dismiss', {
        method: 'POST',
        headers: authHeader(),
      });
      await refreshSession();
    } finally {
      router.push('/dashboard');
    }
  }

  return (
    <AuthShell
      title="Tautkan ORCID iD Anda"
      subtitle="Sekali tertaut, seluruh karya ber-DOI dari ORCID langsung tersinkron ke profil UNICAL Anda."
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="orcid" className="block text-sm font-medium text-slate-700">
            ORCID iD
          </label>
          <input
            id="orcid"
            value={orcid}
            onChange={(e) => setOrcid(e.target.value)}
            placeholder="0000-0003-1469-9468"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <p className="mt-1 text-xs text-slate-500">
            Belum punya? Daftar gratis di{' '}
            <a
              href="https://orcid.org/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              orcid.org/register
            </a>
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {summary && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {summary} Mengalihkan ke dashboard…
          </p>
        )}

        <button
          onClick={link}
          disabled={busy || !valid}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy && !summary ? 'Menautkan & menyinkronkan karya…' : 'Tautkan & Sinkronkan'}
        </button>

        <button
          onClick={skip}
          disabled={busy}
          className="w-full text-center text-sm text-slate-500 hover:text-slate-700 hover:underline"
        >
          Lewati, tautkan nanti dari Pengaturan Akun
        </button>
      </div>
    </AuthShell>
  );
}
