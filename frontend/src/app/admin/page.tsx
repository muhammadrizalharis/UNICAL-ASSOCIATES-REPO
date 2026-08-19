'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { authHeader } from '@/lib/session';
import { RequireAuth, TopBar } from '@/components/require-auth';

interface PendingPublication {
  id: string;
  doi: string;
  title: string;
  submittedBy: { email: string };
}

interface PendingResearcher {
  id: string;
  fullName: string;
  user: { email: string };
  faculty: { name: string } | null;
  department: { name: string } | null;
}

interface PendingClaim {
  id: string;
  researcher: { unicalId: string | null; fullName: string };
  publicationAuthor: {
    rawAuthorName: string;
    authorOrder: number;
    publication: { id: string; title: string; doi: string };
  };
}

interface OpenReport {
  id: string;
  type: string;
  reason: string;
  contact: string | null;
  publication: { id: string; title: string; doi: string } | null;
  createdAt: string;
}

export default function AdminPage() {
  return (
    <RequireAuth staffOnly>
      {(user) => (
        <div className="min-h-screen bg-slate-50">
          <TopBar user={user} />
          <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
            <h1 className="text-2xl font-semibold text-slate-900">Panel Pengelola</h1>
            <PublicationQueue />
            <ClaimQueue />
            <ReportQueue />
            {user.role !== 'MODERATOR' && <ResearcherQueue />}
          </main>
        </div>
      )}
    </RequireAuth>
  );
}

function PublicationQueue() {
  const [rows, setRows] = useState<PendingPublication[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: PendingPublication[] }>('/admin/publications', {
      headers: authHeader(),
    })
      .then((body) => setRows(body.data))
      .catch(() => setNote('Gagal memuat antrean publikasi.'));

  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, approve: boolean) {
    const path = `/admin/publications/${id}/${approve ? 'approve' : 'reject'}`;
    await apiFetch(path, {
      method: 'PATCH',
      headers: authHeader(),
      body: approve ? undefined : JSON.stringify({ reason: 'Tidak sesuai kriteria.' }),
    });
    setNote(approve ? 'Publikasi disetujui.' : 'Publikasi ditolak.');
    void load();
  }

  return (
    <section>
      <h2 className="mb-3 font-medium text-slate-900">
        Antrean Verifikasi Publikasi ({rows.length})
      </h2>
      {note && <p className="mb-3 text-sm text-emerald-700">{note}</p>}

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {rows.length === 0 && (
          <p className="px-4 py-4 text-sm text-slate-500">Tidak ada antrean.</p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{row.title}</p>
              <p className="truncate text-xs text-slate-500">
                {row.doi} · {row.submittedBy.email}
              </p>
            </div>
            <button
              onClick={() => decide(row.id, true)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
            >
              Setujui
            </button>
            <button
              onClick={() => decide(row.id, false)}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Tolak
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClaimQueue() {
  const [rows, setRows] = useState<PendingClaim[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: PendingClaim[] }>('/admin/claims', { headers: authHeader() })
      .then((body) => setRows(body.data))
      .catch(() => setNote('Gagal memuat antrean klaim.'));

  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, approve: boolean) {
    await apiFetch(`/admin/claims/${id}/${approve ? 'approve' : 'reject'}`, {
      method: 'PATCH',
      headers: authHeader(),
      body: approve
        ? undefined
        : JSON.stringify({ reason: 'Nama tidak cocok dengan slot penulis.' }),
    });
    setNote(approve ? 'Klaim disetujui; metrik pemohon dihitung ulang.' : 'Klaim ditolak.');
    void load();
  }

  return (
    <section>
      <h2 className="mb-3 font-medium text-slate-900">
        Klaim Kepenulisan ({rows.length})
      </h2>
      {note && <p className="mb-3 text-sm text-emerald-700">{note}</p>}

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {rows.length === 0 && (
          <p className="px-4 py-4 text-sm text-slate-500">Tidak ada antrean.</p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {row.researcher.fullName}
                {row.researcher.unicalId && (
                  <span className="ml-1 text-xs text-slate-500">
                    ({row.researcher.unicalId})
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-slate-500">
                mengklaim slot #{row.publicationAuthor.authorOrder} “
                {row.publicationAuthor.rawAuthorName}” pada{' '}
                {row.publicationAuthor.publication.title}
              </p>
            </div>
            <button
              onClick={() => decide(row.id, true)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
            >
              Setujui
            </button>
            <button
              onClick={() => decide(row.id, false)}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Tolak
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportQueue() {
  const [rows, setRows] = useState<OpenReport[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: OpenReport[] }>('/admin/reports?status=OPEN', {
      headers: authHeader(),
    })
      .then((body) => setRows(body.data))
      .catch(() => setNote('Gagal memuat laporan.'));

  useEffect(() => {
    void load();
  }, []);

  async function close(id: string, status: 'RESOLVED' | 'DISMISSED') {
    const resolutionNote = window.prompt(
      status === 'RESOLVED'
        ? 'Catatan penyelesaian (mis. tindakan yang diambil):'
        : 'Alasan mengabaikan laporan:',
    );
    if (!resolutionNote || resolutionNote.trim().length < 5) return;

    await apiFetch(`/admin/reports/${id}`, {
      method: 'PATCH',
      headers: authHeader(),
      body: JSON.stringify({ status, resolutionNote }),
    }).catch(() => setNote('Gagal menutup laporan.'));
    void load();
  }

  const TYPE_LABEL: Record<string, string> = {
    TAKEDOWN: 'Takedown',
    ABUSE: 'Penyalahgunaan',
    OTHER: 'Lainnya',
  };

  return (
    <section>
      <h2 className="mb-3 font-medium text-slate-900">
        Laporan Masuk ({rows.length})
      </h2>
      {note && <p className="mb-3 text-sm text-emerald-700">{note}</p>}

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {rows.length === 0 && (
          <p className="px-4 py-4 text-sm text-slate-500">Tidak ada laporan terbuka.</p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700">
                {TYPE_LABEL[row.type] ?? row.type}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(row.createdAt).toLocaleString('id-ID')} ·{' '}
                {row.contact ?? 'anonim'}
              </span>
            </div>
            {row.publication && (
              <p className="mt-1 truncate text-xs text-slate-500">
                Publikasi: {row.publication.title} ({row.publication.doi})
              </p>
            )}
            <p className="mt-1 text-sm text-slate-700">{row.reason}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => void close(row.id, 'RESOLVED')}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
              >
                Selesai ditangani
              </button>
              <button
                onClick={() => void close(row.id, 'DISMISSED')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Abaikan
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResearcherQueue() {
  const [rows, setRows] = useState<PendingResearcher[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: PendingResearcher[] }>('/admin/researchers/pending', {
      headers: authHeader(),
    })
      .then((body) => setRows(body.data))
      .catch(() => setNote('Gagal memuat daftar peneliti.'));

  useEffect(() => {
    void load();
  }, []);

  async function verify(id: string) {
    const body = await apiFetch<{ data: { unicalId: string } }>(
      `/admin/researchers/${id}/verify`,
      { method: 'PATCH', headers: authHeader() },
    );
    setNote(`UNICAL ID diterbitkan: ${body.data.unicalId}`);
    void load();
  }

  return (
    <section>
      <h2 className="mb-3 font-medium text-slate-900">
        Peneliti Menunggu Verifikasi ({rows.length})
      </h2>
      {note && <p className="mb-3 text-sm text-emerald-700">{note}</p>}

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {rows.length === 0 && (
          <p className="px-4 py-4 text-sm text-slate-500">Tidak ada antrean.</p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {row.fullName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {row.user.email}
                {row.department && ` · ${row.department.name}`}
                {row.faculty && ` · ${row.faculty.name}`}
              </p>
            </div>
            <button
              onClick={() => verify(row.id)}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              Terbitkan UNICAL ID
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
