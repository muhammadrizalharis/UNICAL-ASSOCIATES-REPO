'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader } from '@/lib/session';
import { RequireAuth, TopBar } from '@/components/require-auth';
import {
  ImportItem,
  ResolvedPreview,
  ResultList,
  uploadFile,
} from '@/components/import-result';

type Tab = 'identifier' | 'pdf' | 'pustaka' | 'manual';

const TABS: { id: Tab; label: string; hint: string }[] = [
  {
    id: 'identifier',
    label: 'DOI & Identifier',
    hint: 'Tempel DOI, arXiv, PMID, PMCID, atau ISBN. Satu per baris.',
  },
  {
    id: 'pdf',
    label: 'Unggah PDF',
    hint: 'DOI dibaca langsung dari isi berkas PDF.',
  },
  {
    id: 'pustaka',
    label: 'Impor Pustaka',
    hint: 'Berkas ekspor Mendeley, Zotero, atau EndNote (.bib, .ris).',
  },
  {
    id: 'manual',
    label: 'Input Manual',
    hint: 'Untuk karya yang tidak memiliki identifier apa pun.',
  },
];

export default function UnggahPage() {
  const [tab, setTab] = useState<Tab>('identifier');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setItems([]);
    setError(null);
  }

  return (
    <RequireAuth>
      {(user) => (
        <div className="min-h-screen bg-slate-50">
          <TopBar user={user} />

          <main className="mx-auto max-w-3xl px-4 py-8">
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
              ← Dashboard
            </Link>

            <h1 className="mt-3 text-2xl font-semibold text-slate-900">
              Unggah Publikasi
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Metadata diambil otomatis dari CrossRef, OpenAlex, dan Semantic Scholar.
            </p>

            <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    reset();
                  }}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                    tab === t.id
                      ? 'border-indigo-600 font-medium text-indigo-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {TABS.find((t) => t.id === tab)?.hint}
            </p>

            <div className="mt-4">
              {tab === 'identifier' && (
                <IdentifierTab
                  busy={busy}
                  setBusy={setBusy}
                  setItems={setItems}
                  setError={setError}
                />
              )}
              {tab === 'pdf' && (
                <FileTab
                  accept=".pdf"
                  path="/publications/import/pdf"
                  busy={busy}
                  setBusy={setBusy}
                  setItems={setItems}
                  setError={setError}
                />
              )}
              {tab === 'pustaka' && (
                <FileTab
                  accept=".bib,.ris,.enw,.txt,.csv"
                  path="/publications/import/library"
                  busy={busy}
                  setBusy={setBusy}
                  setItems={setItems}
                  setError={setError}
                />
              )}
              {tab === 'manual' && (
                <ManualTab
                  busy={busy}
                  setBusy={setBusy}
                  setItems={setItems}
                  setError={setError}
                />
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <ResultList items={items} />
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

interface TabProps {
  busy: boolean;
  setBusy: (v: boolean) => void;
  setItems: (items: ImportItem[]) => void;
  setError: (message: string | null) => void;
}

function IdentifierTab({ busy, setBusy, setItems, setError }: TabProps) {
  const [text, setText] = useState('');

  async function submit() {
    const identifiers = text
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (identifiers.length === 0) {
      setError('Masukkan minimal satu identifier.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const body = await apiFetch<{ data: { items: ImportItem[] } }>(
        '/publications/import/identifiers',
        {
          method: 'POST',
          headers: authHeader(),
          body: JSON.stringify({ identifiers }),
        },
      );
      setItems(body.data.items);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Permintaan gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'10.1038/nature12373\narXiv:1706.03762\n10.3390/su13084314'}
        className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? 'Mengambil metadata…' : 'Ambil Metadata'}
      </button>
    </div>
  );
}

function FileTab({
  accept,
  path,
  busy,
  setBusy,
  setItems,
  setError,
}: TabProps & { accept: string; path: string }) {
  const [file, setFile] = useState<File | null>(null);

  async function submit() {
    if (!file) {
      setError('Pilih berkas terlebih dahulu.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const body = await uploadFile<{ data: Record<string, unknown> }>(path, file);
      const payload = body.data;

      // Impor pustaka mengembalikan daftar; unggah PDF mengembalikan satu entri.
      setItems(
        Array.isArray(payload.items)
          ? (payload.items as ImportItem[])
          : [payload as unknown as ImportItem],
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Berkas gagal diproses.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept={accept}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
      />
      <p className="text-xs text-slate-500">Ukuran maksimal 25 MB.</p>
      <button
        onClick={submit}
        disabled={busy || !file}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? 'Memproses berkas…' : 'Proses Berkas'}
      </button>
    </div>
  );
}

function ManualTab({ busy, setBusy, setItems, setError }: TabProps) {
  const [form, setForm] = useState({
    title: '',
    authors: '',
    journal: '',
    year: '',
    pages: '',
    abstract: '',
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit() {
    setBusy(true);
    setError(null);

    try {
      const body = await apiFetch<{ data: ResolvedPreview }>(
        '/publications/import/manual',
        {
          method: 'POST',
          headers: authHeader(),
          body: JSON.stringify({
            title: form.title,
            authors: form.authors
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean),
            journal: form.journal || undefined,
            year: form.year ? Number(form.year) : undefined,
            pages: form.pages || undefined,
            abstract: form.abstract || undefined,
          }),
        },
      );

      setItems([
        {
          input: form.title,
          status: 'ok',
          message: 'Tanpa DOI, penyimpanan permanen menyusul.',
          data: body.data,
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Data tidak valid.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Input label="Judul" value={form.title} onChange={(v) => update('title', v)} />
      <Input
        label="Penulis (pisahkan dengan koma)"
        value={form.authors}
        onChange={(v) => update('authors', v)}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Jurnal" value={form.journal} onChange={(v) => update('journal', v)} />
        <Input label="Tahun" value={form.year} onChange={(v) => update('year', v)} />
        <Input label="Halaman" value={form.pages} onChange={(v) => update('pages', v)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Abstrak</label>
        <textarea
          rows={4}
          value={form.abstract}
          onChange={(e) => update('abstract', e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
      </div>
      <button
        onClick={submit}
        disabled={busy || form.title.length < 5}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? 'Memproses…' : 'Pratinjau'}
      </button>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}
