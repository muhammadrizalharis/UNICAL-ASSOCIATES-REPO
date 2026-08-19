'use client';

import { useState } from 'react';
import { apiFetch, ApiRequestError } from '@/lib/api';

/** Formulir laporan takedown/penyalahgunaan; boleh tanpa akun. */
export function ReportForm() {
  const [type, setType] = useState<'TAKEDOWN' | 'ABUSE' | 'OTHER'>('TAKEDOWN');
  const [publicationUrl, setPublicationUrl] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    // Terima URL publikasi penuh ataupun UUID mentah.
    const match = publicationUrl.match(/[0-9a-f]{8}-[0-9a-f-]{27}[0-9a-f]/i);

    try {
      const res = await apiFetch<{ data: { message: string } }>('/reports', {
        method: 'POST',
        body: JSON.stringify({
          type,
          reason,
          email: email || undefined,
          publicationId: match?.[0],
        }),
      });
      setDone(res.data.message);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Laporan gagal terkirim.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{done}</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Jenis laporan
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="TAKEDOWN">Pelanggaran hak cipta (takedown)</option>
          <option value="ABUSE">Penyalahgunaan / spam / pelecehan</option>
          <option value="OTHER">Lainnya</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Tautan publikasi terkait (opsional)
        </label>
        <input
          value={publicationUrl}
          onChange={(e) => setPublicationUrl(e.target.value)}
          placeholder="https://…/publikasi/…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Email Anda (untuk tindak lanjut)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@contoh.ac.id"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Uraian laporan (minimal 20 karakter)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={4000}
          required
          minLength={20}
          placeholder="Jelaskan pelanggaran, bukti kepemilikan hak, dan permintaan Anda…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <button
        disabled={busy || reason.trim().length < 20}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? 'Mengirim…' : 'Kirim Laporan'}
      </button>
    </form>
  );
}
