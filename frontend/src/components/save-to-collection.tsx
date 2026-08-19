'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader, readUser } from '@/lib/session';

interface CollectionRow {
  id: string;
  name: string;
  _count?: { items: number };
}

/** Simpan publikasi ke koleksi/reading list pribadi. */
export function SaveToCollection({ publicationId }: { publicationId: string }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(readUser()));
  }, []);

  if (!loggedIn) return null;

  async function toggle() {
    if (!open) {
      try {
        const res = await apiFetch<{ data: CollectionRow[] }>('/collections', {
          headers: authHeader(),
        });
        setCollections(res.data);
      } catch {
        setCollections([]);
      }
    }
    setMessage(null);
    setOpen((v) => !v);
  }

  async function addTo(collectionId: string) {
    try {
      await apiFetch(`/collections/${collectionId}/items`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ publicationId }),
      });
      setMessage('Tersimpan ke koleksi.');
      setOpen(false);
    } catch (err) {
      setMessage(
        err instanceof ApiRequestError ? err.message : 'Gagal menyimpan.',
      );
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    try {
      const res = await apiFetch<{ data: { id: string } }>('/collections', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName('');
      await addTo(res.data.id);
    } catch (err) {
      setMessage(
        err instanceof ApiRequestError ? err.message : 'Gagal membuat koleksi.',
      );
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => void toggle()}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-amber-400 hover:text-amber-700"
      >
        🔖 Simpan
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <p className="mb-1 px-1 text-xs text-slate-500">Pilih koleksi:</p>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => void addTo(c.id)}
              className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-amber-50"
            >
              {c.name}
              {c._count ? (
                <span className="text-xs text-slate-400"> · {c._count.items}</span>
              ) : null}
            </button>
          ))}
          <div className="mt-1 flex gap-1 border-t border-slate-100 pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Koleksi baru…"
              maxLength={80}
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs outline-none focus:border-amber-500"
            />
            <button
              onClick={() => void createAndAdd()}
              className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              Buat
            </button>
          </div>
        </div>
      )}

      {message && <p className="mt-1 text-xs text-slate-500">{message}</p>}
    </div>
  );
}
