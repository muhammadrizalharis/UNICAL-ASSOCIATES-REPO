'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader, readUser } from '@/lib/session';

interface CommentView {
  id: string;
  body: string;
  deleted: boolean;
  createdAt: string;
  author: { fullName: string | null; unicalId: string | null };
  replies?: CommentView[];
}

/** Diskusi publik pada halaman publikasi. */
export function CommentsSection({ publicationId }: { publicationId: string }) {
  const [comments, setComments] = useState<CommentView[]>([]);
  const [total, setTotal] = useState(0);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  async function load() {
    try {
      const res = await apiFetch<{ data: CommentView[]; meta: { total: number } }>(
        `/publications/${publicationId}/comments`,
      );
      setComments(res.data);
      setTotal(res.meta.total);
    } catch {
      // Diskusi bukan konten kritis; biarkan kosong bila gagal.
    }
  }

  useEffect(() => {
    setLoggedIn(Boolean(readUser()));
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicationId]);

  async function submit() {
    if (body.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/publications/${publicationId}/comments`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          body: body.trim(),
          ...(replyTo ? { parentId: replyTo } : {}),
        }),
      });
      setBody('');
      setReplyTo(null);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Komentar gagal terkirim.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/comments/${id}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      await load();
    } catch {
      // Penghapusan gagal dibiarkan senyap; komentar tetap tampil.
    }
  }

  const me = readUser();

  function CommentCard({ c, isReply }: { c: CommentView; isReply?: boolean }) {
    return (
      <div
        className={`rounded-md border border-slate-200 bg-white p-3 ${isReply ? 'ml-8' : ''}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-slate-700">
            {c.deleted ? '—' : (c.author.fullName ?? 'Pengguna')}
            {c.author.unicalId && (
              <a
                href={`/profil/${c.author.unicalId}`}
                className="ml-1 text-indigo-600 hover:underline"
              >
                {c.author.unicalId}
              </a>
            )}
          </p>
          <span className="text-xs text-slate-400">
            {new Date(c.createdAt).toLocaleDateString('id-ID')}
          </span>
        </div>
        <p
          className={`mt-1 text-sm ${c.deleted ? 'italic text-slate-400' : 'text-slate-700'}`}
        >
          {c.body}
        </p>
        {loggedIn && !c.deleted && (
          <div className="mt-1 flex gap-3 text-xs">
            {!isReply && (
              <button
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                className="text-indigo-600 hover:underline"
              >
                {replyTo === c.id ? 'Batal balas' : 'Balas'}
              </button>
            )}
            {me && (
              <button
                onClick={() => void remove(c.id)}
                className="text-slate-400 hover:text-red-600"
              >
                Hapus
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-medium text-slate-900">Diskusi ({total})</h2>

      <div className="space-y-2">
        {comments.length === 0 && (
          <p className="text-sm text-slate-500">Belum ada diskusi. Jadilah yang pertama.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="space-y-2">
            <CommentCard c={c} />
            {c.replies?.map((r) => <CommentCard key={r.id} c={r} isReply />)}
            {replyTo === c.id && loggedIn && (
              <div className="ml-8">
                <ComposeBox
                  value={body}
                  onChange={setBody}
                  onSubmit={submit}
                  busy={busy}
                  placeholder="Tulis balasan…"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {loggedIn && !replyTo && (
        <div className="mt-3">
          <ComposeBox
            value={body}
            onChange={setBody}
            onSubmit={submit}
            busy={busy}
            placeholder="Tulis komentar (minimal 3 karakter)…"
          />
        </div>
      )}

      {!loggedIn && (
        <p className="mt-3 text-xs text-slate-500">
          <a href="/welcome" className="text-indigo-600 hover:underline">
            Masuk
          </a>{' '}
          untuk ikut berdiskusi.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}

function ComposeBox({
  value,
  onChange,
  onSubmit,
  busy,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        maxLength={2000}
        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
      />
      <button
        disabled={busy || value.trim().length < 3}
        onClick={onSubmit}
        className="self-end rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Kirim
      </button>
    </div>
  );
}
