'use client';

import { useEffect, useRef, useState } from 'react';
import { apiBase, apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader, readUser } from '@/lib/session';

interface AuthorSlot {
  name: string;
  order: number;
  claimed: boolean;
}

/** Tombol ekspor sitasi + klaim kepenulisan pada halaman detail publikasi. */
export function PublicationActions({
  publicationId,
  authors,
  hasPdf = false,
}: {
  publicationId: string;
  authors: AuthorSlot[];
  hasPdf?: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-slate-500">Ekspor sitasi:</span>
      {(['bibtex', 'ris', 'apa', 'ieee'] as const).map((format) => (
        <a
          key={format}
          href={`${apiBase()}/publications/${publicationId}/export?format=${format}`}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 uppercase transition hover:border-indigo-400 hover:text-indigo-700"
        >
          {format}
        </a>
      ))}
      <ClaimButton publicationId={publicationId} authors={authors} />
      <PdfUploadButton publicationId={publicationId} hasPdf={hasPdf} />
    </div>
  );
}

function PdfUploadButton({
  publicationId,
  hasPdf,
}: {
  publicationId: string;
  hasPdf: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(readUser()));
  }, []);

  if (!loggedIn) return null;

  async function upload(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${apiBase()}/publications/${publicationId}/pdf`, {
        method: 'POST',
        headers: authHeader(),
        body,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message ?? 'Unggah gagal.');
      }
      setMessage('PDF tersimpan. Muat ulang halaman untuk melihat tautannya.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unggah gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = '';
        }}
      />
      <button
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-rose-400 hover:text-rose-700 disabled:opacity-60"
      >
        {busy ? 'Mengunggah…' : hasPdf ? 'Ganti PDF' : '📄 Unggah PDF'}
      </button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </>
  );
}

function ClaimButton({
  publicationId,
  authors,
}: {
  publicationId: string;
  authors: AuthorSlot[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unclaimed = authors.filter((a) => !a.claimed);
  if (unclaimed.length === 0) return null;

  async function claim(order: number) {
    if (!readUser()) {
      window.location.href = '/masuk';
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/publications/${publicationId}/claim`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ authorOrder: order }),
      });
      setNote('Klaim terkirim. Moderator akan meninjau kecocokan nama Anda.');
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Klaim gagal terkirim.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
      >
        ✋ Ini publikasi saya
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <p className="mb-1 px-1 text-xs text-slate-500">
            Pilih nama Anda pada daftar penulis:
          </p>
          {unclaimed.map((author) => (
            <button
              key={author.order}
              disabled={busy}
              onClick={() => claim(author.order)}
              className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-indigo-50 disabled:opacity-60"
            >
              {author.order}. {author.name}
            </button>
          ))}
        </div>
      )}

      {note && <p className="mt-2 text-xs text-emerald-700">{note}</p>}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
