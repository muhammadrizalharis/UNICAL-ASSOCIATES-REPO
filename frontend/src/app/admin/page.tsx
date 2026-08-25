'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { authHeader, clearSession, type SessionUser } from '@/lib/session';
import { RequireAuth } from '@/components/require-auth';
import { ThemeToggle } from '@/components/theme-toggle';

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

interface ManagedUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  unicalId: string | null;
  orcid: string | null;
  authorships: number;
  submitted: number;
  lastLoginAt: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  FACULTY_ADMIN: 'Admin Fakultas',
  MODERATOR: 'Moderator',
  MEMBER: 'Anggota',
};

const TONES: Record<string, { tile: string; badge: string }> = {
  indigo: { tile: 'bg-indigo-50 text-indigo-700', badge: 'bg-indigo-50 text-indigo-700' },
  amber: { tile: 'bg-amber-50 text-amber-700', badge: 'bg-amber-50 text-amber-700' },
  rose: { tile: 'bg-rose-100 text-rose-700', badge: 'bg-rose-100 text-rose-700' },
  emerald: { tile: 'bg-emerald-50 text-emerald-700', badge: 'bg-emerald-50 text-emerald-700' },
  slate: { tile: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-600' },
};

const ICONS: Record<string, string> = {
  doc: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  claim: 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.375 21c-2.331 0-4.512-.645-6.375-1.765Z',
  flag: 'M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5',
  id: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z',
  users: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  bell: 'M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0',
  logout: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75',
  shield: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.211-2.571-.599-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286Z',
  grid: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z',
  check: 'm4.5 12.75 6 6 9-13.5',
  x: 'M6 18 18 6M6 6l12 12',
  trash: 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
};

const BTN_APPROVE =
  'inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-[#f8fafc] shadow-sm transition hover:bg-emerald-500';
const BTN_PRIMARY =
  'inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-[#f8fafc] shadow-sm transition hover:bg-indigo-500';
const BTN_REJECT =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700';
const BTN_GHOST =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50';
const BTN_DANGER =
  'inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50';

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABEL[role] ?? role;
  if (role === 'SUPER_ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#f8fafc] uppercase">
        <Icon name="shield" className="h-3 w-3" />
        {label}
      </span>
    );
  }
  const tone =
    role === 'MODERATOR'
      ? 'bg-amber-50 text-amber-700'
      : role === 'FACULTY_ADMIN'
        ? 'bg-indigo-50 text-indigo-700'
        : 'bg-slate-100 text-slate-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${tone}`}
    >
      {label}
    </span>
  );
}

function Metric({
  tone,
  icon,
  label,
  value,
}: {
  tone: string;
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:shadow-md hover:ring-indigo-100">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone].tile}`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="text-3xl font-extrabold tabular-nums text-slate-900">{value}</span>
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function SectionCard({
  tone,
  icon,
  title,
  count,
  description,
  danger = false,
  children,
}: {
  tone: string;
  icon: string;
  title: string;
  count: number;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`animate-fade-up overflow-hidden rounded-2xl border bg-white shadow-sm ${danger ? 'border-rose-200' : 'border-slate-200'}`}
    >
      <div
        className={`flex items-center gap-3 border-b px-5 py-4 ${danger ? 'border-rose-100 bg-rose-50/40' : 'border-slate-100'}`}
      >
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone].tile}`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="truncate">{title}</span>
            <span
              className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold ${TONES[tone].badge}`}
            >
              {count}
            </span>
          </h2>
          {description && <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function Note({ text }: { text: string }) {
  const err = /gagal/i.test(text);
  return (
    <div
      className={`mx-5 mt-4 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${err ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}
    >
      <Icon name={err ? 'x' : 'check'} className="h-4 w-4" />
      {text}
    </div>
  );
}

function AdminBar({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    apiFetch<{ meta: { unread: number } }>('/notifications', { headers: authHeader() })
      .then((res) => setUnread(res.meta.unread))
      .catch(() => undefined);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div
        className="h-0.5 w-full bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#4f46e5]"
        aria-hidden
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-unical.png"
            alt="Logo UNICAL ASSOCIATES REPO"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-extrabold tracking-tight text-slate-900">
              <span className="truncate">Konsol Pengelola</span>
              <RoleBadge role={user.role} />
            </p>
            <p className="truncate text-xs text-slate-500">
              {user.profile?.fullName}
              {user.profile?.unicalId && ` · ${user.profile.unicalId}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Link
            href="/dashboard/notifikasi"
            title="Notifikasi"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            <Icon name="bell" className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-[#f8fafc]">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/profil"
            title="Profil saya"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 py-1 pr-3 pl-1 text-sm font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50/60"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-xs font-bold text-[#f8fafc]">
              {(user.profile?.firstName ?? user.email).charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:inline">Profil</span>
          </Link>
          <button
            onClick={() => {
              clearSession();
              router.replace('/masuk');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
          >
            <Icon name="logout" className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}

type Counts = {
  publications: number;
  claims: number;
  reports: number;
  researchers: number;
  users: number;
};

function AdminConsole({ user }: { user: SessionUser }) {
  const [counts, setCounts] = useState<Counts>({
    publications: 0,
    claims: 0,
    reports: 0,
    researchers: 0,
    users: 0,
  });
  const set = (key: keyof Counts) => (n: number) =>
    setCounts((c) => (c[key] === n ? c : { ...c, [key]: n }));

  const isSuper = user.role === 'SUPER_ADMIN';
  const showResearchers = user.role !== 'MODERATOR';

  const metrics = [
    { tone: 'indigo', icon: 'doc', label: 'Antrean Publikasi', value: counts.publications },
    { tone: 'amber', icon: 'claim', label: 'Klaim Kepenulisan', value: counts.claims },
    { tone: 'rose', icon: 'flag', label: 'Laporan Terbuka', value: counts.reports },
    ...(showResearchers
      ? [{ tone: 'emerald', icon: 'id', label: 'Peneliti Menunggu', value: counts.researchers }]
      : []),
    ...(isSuper
      ? [{ tone: 'slate', icon: 'users', label: 'Total Pengguna', value: counts.users }]
      : []),
  ];
  const pending =
    counts.publications + counts.claims + counts.reports + (showResearchers ? counts.researchers : 0);
  const gridCls =
    metrics.length >= 5 ? 'lg:grid-cols-5' : metrics.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminBar user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              <Icon name="grid" className="h-3.5 w-3.5" />
              Konsol Moderasi &amp; Tata Kelola
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              Panel Pengelola
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola verifikasi publikasi, klaim kepenulisan, laporan, dan{' '}
              {isSuper ? 'akun pengguna' : 'peneliti'} repositori.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center shadow-sm">
            <p className="text-3xl font-extrabold tabular-nums text-slate-900">{pending}</p>
            <p className="text-xs font-medium text-slate-500">Item menunggu tindakan</p>
          </div>
        </div>

        <div className={`mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 ${gridCls}`}>
          {metrics.map((m) => (
            <Metric key={m.label} {...m} />
          ))}
        </div>

        <div className="mt-8 space-y-6">
          <PublicationQueue onCount={set('publications')} />
          <ClaimQueue onCount={set('claims')} />
          <ReportQueue onCount={set('reports')} />
          {showResearchers && <ResearcherQueue onCount={set('researchers')} />}
          {isSuper && <UserManagement selfId={user.id} onCount={set('users')} />}
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return <RequireAuth staffOnly>{(user) => <AdminConsole user={user} />}</RequireAuth>;
}

function PublicationQueue({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<PendingPublication[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: PendingPublication[] }>('/admin/publications', {
      headers: authHeader(),
    })
      .then((body) => {
        setRows(body.data);
        onCount(body.data.length);
      })
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
    <SectionCard
      tone="indigo"
      icon="doc"
      title="Antrean Verifikasi Publikasi"
      count={rows.length}
      description="Tinjau metadata sebelum publikasi tayang di katalog publik."
    >
      {note && <Note text={note} />}
      {rows.length === 0 ? (
        <EmptyState icon="check" message="Tidak ada antrean — semua publikasi sudah ditinjau." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="truncate text-xs text-slate-500">
                  {row.doi} · {row.submittedBy.email}
                </p>
              </div>
              <button onClick={() => decide(row.id, true)} className={BTN_APPROVE}>
                <Icon name="check" className="h-4 w-4" />
                Setujui
              </button>
              <button onClick={() => decide(row.id, false)} className={BTN_REJECT}>
                <Icon name="x" className="h-4 w-4" />
                Tolak
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ClaimQueue({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<PendingClaim[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: PendingClaim[] }>('/admin/claims', { headers: authHeader() })
      .then((body) => {
        setRows(body.data);
        onCount(body.data.length);
      })
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
    <SectionCard
      tone="amber"
      icon="claim"
      title="Klaim Kepenulisan"
      count={rows.length}
      description="Setujui bila nama pemohon cocok dengan slot penulis publikasi."
    >
      {note && <Note text={note} />}
      {rows.length === 0 ? (
        <EmptyState icon="check" message="Tidak ada klaim menunggu persetujuan." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-900">
                  <span className="truncate">{row.researcher.fullName}</span>
                  {row.researcher.unicalId && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                      {row.researcher.unicalId}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500">
                  mengklaim slot #{row.publicationAuthor.authorOrder} “
                  {row.publicationAuthor.rawAuthorName}” pada{' '}
                  {row.publicationAuthor.publication.title}
                </p>
              </div>
              <button onClick={() => decide(row.id, true)} className={BTN_APPROVE}>
                <Icon name="check" className="h-4 w-4" />
                Setujui
              </button>
              <button onClick={() => decide(row.id, false)} className={BTN_REJECT}>
                <Icon name="x" className="h-4 w-4" />
                Tolak
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ReportQueue({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<OpenReport[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: OpenReport[] }>('/admin/reports?status=OPEN', {
      headers: authHeader(),
    })
      .then((body) => {
        setRows(body.data);
        onCount(body.data.length);
      })
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
    <SectionCard
      tone="rose"
      icon="flag"
      title="Laporan Masuk"
      count={rows.length}
      description="Tangani laporan takedown hak cipta dan penyalahgunaan konten."
    >
      {note && <Note text={note} />}
      {rows.length === 0 ? (
        <EmptyState icon="check" message="Tidak ada laporan terbuka." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li key={row.id} className="px-5 py-4 transition hover:bg-slate-50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  {TYPE_LABEL[row.type] ?? row.type}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(row.createdAt).toLocaleString('id-ID')} · {row.contact ?? 'anonim'}
                </span>
              </div>
              {row.publication && (
                <p className="mt-1.5 truncate text-xs text-slate-500">
                  Publikasi: {row.publication.title} ({row.publication.doi})
                </p>
              )}
              <p className="mt-1.5 text-sm text-slate-700">{row.reason}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => void close(row.id, 'RESOLVED')} className={BTN_APPROVE}>
                  <Icon name="check" className="h-4 w-4" />
                  Selesai ditangani
                </button>
                <button onClick={() => void close(row.id, 'DISMISSED')} className={BTN_GHOST}>
                  Abaikan
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function ResearcherQueue({ onCount }: { onCount: (n: number) => void }) {
  const [rows, setRows] = useState<PendingResearcher[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: PendingResearcher[] }>('/admin/researchers/pending', {
      headers: authHeader(),
    })
      .then((body) => {
        setRows(body.data);
        onCount(body.data.length);
      })
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
    <SectionCard
      tone="emerald"
      icon="id"
      title="Peneliti Menunggu Verifikasi"
      count={rows.length}
      description="Terbitkan UNICAL ID permanen untuk peneliti yang tervalidasi."
    >
      {note && <Note text={note} />}
      {rows.length === 0 ? (
        <EmptyState icon="check" message="Tidak ada peneliti menunggu verifikasi." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-sm font-bold text-[#f8fafc]">
                {row.fullName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{row.fullName}</p>
                <p className="truncate text-xs text-slate-500">
                  {row.user.email}
                  {row.department && ` · ${row.department.name}`}
                  {row.faculty && ` · ${row.faculty.name}`}
                </p>
              </div>
              <button onClick={() => verify(row.id)} className={BTN_PRIMARY}>
                <Icon name="id" className="h-4 w-4" />
                Terbitkan UNICAL ID
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function UserManagement({ selfId, onCount }: { selfId: string; onCount: (n: number) => void }) {
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    apiFetch<{ data: ManagedUser[] }>('/admin/users', { headers: authHeader() })
      .then((body) => {
        setRows(body.data);
        onCount(body.data.length);
      })
      .catch(() => setNote('Gagal memuat daftar pengguna.'));

  useEffect(() => {
    void load();
  }, []);

  async function remove(user: ManagedUser) {
    const ok = window.confirm(
      `Hapus akun ${user.fullName} (${user.email})?\n` +
        `Unggahannya akan dialihkan ke akun Anda dan tindakan ini tidak dapat dibatalkan.`,
    );
    if (!ok) return;
    try {
      await apiFetch(`/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      setNote(`Akun ${user.email} dihapus.`);
      void load();
    } catch {
      setNote('Gagal menghapus akun.');
    }
  }

  return (
    <SectionCard
      tone="slate"
      icon="users"
      title="Manajemen Pengguna"
      count={rows.length}
      danger
      description="Zona sensitif — penghapusan akun bersifat permanen."
    >
      {note && <Note text={note} />}
      {rows.length === 0 ? (
        <EmptyState icon="users" message="Belum ada pengguna terdaftar." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                {row.fullName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-900">
                  <span className="truncate">{row.fullName}</span>
                  <RoleBadge role={row.role} />
                </p>
                <p className="truncate text-xs text-slate-500">
                  {row.email}
                  {row.unicalId && ` · ${row.unicalId}`}
                  {row.orcid && ` · ORCID ${row.orcid}`} · {row.authorships} karya ·{' '}
                  {row.submitted} unggahan
                </p>
              </div>
              {row.id !== selfId && row.role !== 'SUPER_ADMIN' && (
                <button onClick={() => remove(row)} className={BTN_DANGER}>
                  <Icon name="trash" className="h-4 w-4" />
                  Hapus
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
