'use client';

import { useEffect, useState } from 'react';
import { apiBase, apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader } from '@/lib/session';

export interface ResolvedPreview {
  doi: string | null;
  title: string;
  abstract: string | null;
  journal: { name: string | null } | null;
  authors: { name: string; order: number }[];
  publishedDate: string | null;
  citationCount: number;
  keywords: string[];
  sources: { metadata: string; abstract: string | null };
}

export interface ImportItem {
  input: string;
  status: 'ok' | 'duplicate' | 'invalid' | 'failed';
  message?: string;
  data?: ResolvedPreview;
}

interface Category {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

interface Indexation {
  id: string;
  code: string;
  name: string;
  level: string | null;
}

const STATUS_STYLE: Record<ImportItem['status'], string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  duplicate: 'bg-amber-100 text-amber-800',
  invalid: 'bg-slate-200 text-slate-700',
  failed: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<ImportItem['status'], string> = {
  ok: 'Siap disimpan',
  duplicate: 'Sudah terdaftar',
  invalid: 'Tidak dikenali',
  failed: 'Gagal diambil',
};

export function ResultList({ items }: { items: ImportItem[] }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [indexations, setIndexations] = useState<Indexation[]>([]);

  useEffect(() => {
    apiFetch<{ data: Category[] }>('/categories')
      .then((b) => setCategories(b.data))
      .catch(() => setCategories([]));
    apiFetch<{ data: Indexation[] }>('/indexations')
      .then((b) => setIndexations(b.data))
      .catch(() => setIndexations([]));
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <h2 className="font-medium text-slate-900">Hasil ({items.length})</h2>
      {items.map((item, index) => (
        <ResultCard
          key={`${item.input}-${index}`}
          item={item}
          categories={categories}
          indexations={indexations}
        />
      ))}
    </div>
  );
}

function ResultCard({
  item,
  categories,
  indexations,
}: {
  item: ImportItem;
  categories: Category[];
  indexations: Indexation[];
}) {
  const [open, setOpen] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = item.status === 'ok' && item.data?.doi;

  async function save() {
    if (!item.data?.doi) return;
    setSaving(true);
    setError(null);

    try {
      await apiFetch('/publications', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          doi: item.data.doi,
          categoryIds,
          indexationCodes: codes,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[item.status]}`}
        >
          {STATUS_LABEL[item.status]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {item.data?.title ?? item.input}
          </p>
          <p className="truncate text-xs text-slate-500">
            {item.data
              ? [
                  item.data.journal?.name,
                  item.data.publishedDate?.slice(0, 4),
                  `${item.data.authors.length} penulis`,
                  `${item.data.citationCount} sitasi`,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : item.message}
          </p>
        </div>
        {item.data && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 text-xs text-indigo-600 hover:underline"
          >
            {open ? 'Tutup' : 'Rincian'}
          </button>
        )}
      </div>

      {open && item.data && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Penulis</p>
            <p className="text-slate-700">
              {item.data.authors.map((a) => a.name).join(', ') || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Abstrak{' '}
              {item.data.sources.abstract && (
                <span className="text-slate-400">
                  (sumber: {item.data.sources.abstract})
                </span>
              )}
            </p>
            <p className="line-clamp-4 text-slate-700">
              {item.data.abstract ?? 'Tidak tersedia. Dapat diisi manual nanti.'}
            </p>
          </div>
          {item.data.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.data.keywords.slice(0, 6).map((k) => (
                <span
                  key={k}
                  className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {canSave && !saved && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <Picker
            label="Bidang ilmu"
            options={categories.flatMap((c) =>
              c.children.map((ch) => ({ id: ch.id, label: `${c.name} › ${ch.name}` })),
            )}
            selected={categoryIds}
            onToggle={(id) =>
              setCategoryIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              )
            }
          />
          <Picker
            label="Indeksasi"
            options={indexations.map((i) => ({
              id: i.code,
              label: `${i.name}${i.level ? ` ${i.level}` : ''}`,
            }))}
            selected={codes}
            onToggle={(code) =>
              setCodes((prev) =>
                prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
              )
            }
          />

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Menyimpan…' : 'Simpan ke Repositori'}
          </button>
        </div>
      )}

      {saved && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-emerald-700">
          Tersimpan. Menunggu verifikasi moderator sebelum tampil publik.
        </p>
      )}
    </div>
  );
}

function Picker({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              selected.includes(o.id)
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 text-slate-600 hover:border-indigo-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Unggah berkas memakai FormData sehingga tidak lewat apiFetch. */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(response.status, {
      code: body?.message?.code ?? 'UPLOAD_FAILED',
      message: body?.message?.message ?? 'Berkas gagal diproses.',
    });
  }

  return body as T;
}
