'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { authHeader } from '@/lib/session';
import { RequireAuth, TopBar } from '@/components/require-auth';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  'security.login': '🔐',
  'social.follow': '👥',
  'social.comment': '💬',
  'social.reply': '↩️',
  'social.new_publication': '📄',
  'publication.approved': '✅',
  'publication.rejected': '❌',
  'claim.approved': '✅',
  'claim.rejected': '❌',
};

export default function NotifikasiPage() {
  return (
    <RequireAuth>
      {(user) => (
        <div className="min-h-screen bg-slate-50">
          <TopBar user={user} />
          <main className="mx-auto max-w-2xl px-4 py-8">
            <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
              ← Dashboard
            </Link>
            <NotificationList />
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

function NotificationList() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const router = useRouter();

  async function load() {
    try {
      const res = await apiFetch<{
        data: NotificationRow[];
        meta: { unread: number };
      }>('/notifications', { headers: authHeader() });
      setRows(res.data);
      setUnread(res.meta.unread);
    } catch {
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markAll() {
    await apiFetch('/notifications/read-all', {
      method: 'PATCH',
      headers: authHeader(),
    }).catch(() => undefined);
    await load();
  }

  async function open(n: NotificationRow) {
    if (!n.readAt) {
      await apiFetch(`/notifications/${n.id}/read`, {
        method: 'PATCH',
        headers: authHeader(),
      }).catch(() => undefined);
    }
    if (n.link) router.push(n.link);
    else await load();
  }

  return (
    <>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          Notifikasi{unread > 0 && ` (${unread} belum dibaca)`}
        </h1>
        {unread > 0 && (
          <button
            onClick={() => void markAll()}
            className="text-sm text-indigo-600 hover:underline"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {rows.length === 0 && (
          <li className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            Belum ada notifikasi.
          </li>
        )}
        {rows.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => void open(n)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition hover:border-indigo-300 ${
                n.readAt
                  ? 'border-slate-200 bg-white'
                  : 'border-indigo-200 bg-indigo-50/60'
              }`}
            >
              <p className="text-sm font-medium text-slate-800">
                {TYPE_ICON[n.type] ?? '🔔'} {n.title}
              </p>
              {n.body && <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>}
              <p className="mt-1 text-xs text-slate-400">
                {new Date(n.createdAt).toLocaleString('id-ID')}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
