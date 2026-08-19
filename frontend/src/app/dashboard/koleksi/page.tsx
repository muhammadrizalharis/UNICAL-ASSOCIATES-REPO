'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader } from '@/lib/session';
import { RequireAuth, TopBar } from '@/components/require-auth';

interface CollectionRow {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  _count: { items: number };
}

interface CollectionDetail {
  id: string;
  name: string;
  items: {
    addedAt: string;
    publication: {
      id: string;
      title: string;
      journal: string | null;
      year: number | null;
      citationCount: number;
    };
  }[];
}

export default function KoleksiPage() {
  return (
    <RequireAuth>
      {(user) => (
        <div className="min-h-screen bg-slate-50">
          <TopBar user={user} />
          <main className="mx-auto max-w-2xl px-4 py-8">
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">
              Koleksi Saya
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Reading list pribadi. Simpan publikasi dari tombol 🔖 di halaman
              publikasi.
            </p>
            <CollectionManager />
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

function CollectionManager() {
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CollectionDetail | null>(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ data: CollectionRow[] }>('/collections', {
        headers: authHeader(),
      });
      setCollections(res.data);
    } catch {
      setCollections([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openDetail(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    try {
      const res = await apiFetch<{ data: CollectionDetail }>(
        `/collections/${id}`,
        { headers: authHeader() },
      );
      setOpenId(id);
      setDetail(res.data);
    } catch {
      setDetail(null);
    }
  }

  async function create() {
    if (!newName.trim()) return;
    setError(null);
    try {
      await apiFetch('/collections', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Gagal membuat.');
    }
  }

  async function removeCollection(id: string) {
    await apiFetch(`/collections/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
    }).catch(() => undefined);
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
    }
    await load();
  }

  async function removeItem(collectionId: string, publicationId: string) {
    await apiFetch(`/collections/${collectionId}/items/${publicationId}`, {
      method: 'DELETE',
      headers: authHeader(),
    }).catch(() => undefined);
    await openDetail(collectionId);
    setOpenId(collectionId);
    await load();
  }

  return (
    <>
      <div className="mt-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nama koleksi baru…"
          maxLength={80}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => void create()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Buat
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      <ul className="mt-4 space-y-2">
        {collections.length === 0 && (
          <li className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            Belum ada koleksi.
          </li>
        )}
        {collections.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => void openDetail(c.id)}
                className="text-left font-medium text-slate-800 hover:text-indigo-700"
              >
                {c.name}{' '}
                <span className="text-xs font-normal text-slate-400">
                  · {c._count.items} publikasi
                </span>
              </button>
              <button
                onClick={() => void removeCollection(c.id)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Hapus
              </button>
            </div>

            {openId === c.id && detail && (
              <ul className="space-y-1 border-t border-slate-100 px-4 py-3">
                {detail.items.length === 0 && (
                  <li className="text-sm text-slate-500">Koleksi masih kosong.</li>
                )}
                {detail.items.map((item) => (
                  <li
                    key={item.publication.id}
                    className="flex items-baseline justify-between gap-2 text-sm"
                  >
                    <span>
                      <Link
                        href={`/publikasi/${item.publication.id}`}
                        className="text-indigo-700 hover:underline"
                      >
                        {item.publication.title}
                      </Link>
                      <span className="text-xs text-slate-400">
                        {' '}
                        {[item.publication.journal, item.publication.year]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <button
                      onClick={() => void removeItem(c.id, item.publication.id)}
                      className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                    >
                      Keluarkan
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
