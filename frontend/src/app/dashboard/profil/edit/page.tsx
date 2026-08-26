'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, ApiRequestError } from '@/lib/api';
import {
  authHeader,
  readToken,
  saveSession,
  type SessionUser,
} from '@/lib/session';
import { RequireAuth, TopBar } from '@/components/require-auth';
import { Icon } from '@/components/icons';

interface Faculty {
  id: string;
  name: string;
  _count: { departments: number };
}
interface Department {
  id: string;
  name: string;
  degree: string | null;
  faculty: { id: string; name: string };
}

export default function EditProfilPage() {
  return <RequireAuth>{(user) => <EditForm user={user} />}</RequireAuth>;
}

function EditForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.profile?.firstName ?? '');
  const [lastName, setLastName] = useState(user.profile?.lastName ?? '');
  const [bio, setBio] = useState(user.profile?.bio ?? '');
  const [expertise, setExpertise] = useState<string[]>(user.profile?.expertise ?? []);
  const [expertiseInput, setExpertiseInput] = useState('');
  const [institution, setInstitution] = useState(user.profile?.institution ?? '');
  const [facultyId, setFacultyId] = useState(user.profile?.facultyId ?? '');
  const [departmentId, setDepartmentId] = useState(user.profile?.departmentId ?? '');
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ambil data terbaru agar bio/keahlian/afiliasi terisi walau sesi masih lama.
  useEffect(() => {
    apiFetch<{ data: SessionUser }>('/auth/me', { headers: authHeader() })
      .then(({ data }) => {
        const p = data.profile;
        if (!p) return;
        setFirstName(p.firstName ?? '');
        setLastName(p.lastName ?? '');
        setBio(p.bio ?? '');
        setExpertise(p.expertise ?? []);
        setInstitution(p.institution ?? '');
        setFacultyId(p.facultyId ?? '');
        setDepartmentId(p.departmentId ?? '');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    apiFetch<{ data: Faculty[] }>('/institutions/faculties')
      .then((body) => setFaculties(body.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (facultyId) params.set('facultyId', facultyId);
    const timer = setTimeout(() => {
      apiFetch<{ data: Department[] }>(`/institutions/departments?${params}`)
        .then((body) => setDepartments(body.data))
        .catch(() => setDepartments([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [facultyId]);

  function addExpertise(raw: string) {
    const value = raw.trim();
    if (!value || expertise.length >= 20) return;
    if (expertise.some((e) => e.toLowerCase() === value.toLowerCase())) {
      setExpertiseInput('');
      return;
    }
    setExpertise((prev) => [...prev, value]);
    setExpertiseInput('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/researchers/me', {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim(),
          bio,
          expertise,
          institution: institution.trim(),
          facultyId: facultyId || undefined,
          departmentId: departmentId || undefined,
        }),
      });
      const token = readToken();
      if (token) {
        const me = await apiFetch<{ data: SessionUser }>('/auth/me', {
          headers: authHeader(),
        });
        saveSession(token, me.data);
      }
      router.push('/dashboard/profil');
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Gagal menyimpan profil.',
      );
      setBusy(false);
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Edit Profil
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Perbarui data diri</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nama, bio, bidang keahlian, dan afiliasi Anda tampil di profil publik.
        </p>

        <form
          onSubmit={submit}
          className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
                Nama depan
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={80}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
                Nama belakang
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={80}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
              Bio singkat
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Ringkasan minat riset, jabatan, atau pencapaian Anda."
              className={`${inputCls} resize-y`}
            />
            <p className="mt-1 text-xs text-slate-400">{bio.length}/2000 karakter</p>
          </div>

          <div>
            <label htmlFor="expertiseInput" className="block text-sm font-medium text-slate-700">
              Bidang keahlian
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {expertise.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-sm font-medium text-indigo-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setExpertise((prev) => prev.filter((t) => t !== tag))}
                    aria-label={`Hapus keahlian ${tag}`}
                    className="text-indigo-400 transition hover:text-indigo-700"
                  >
                    <Icon name="x" className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <input
              id="expertiseInput"
              value={expertiseInput}
              onChange={(e) => setExpertiseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addExpertise(expertiseInput);
                }
              }}
              onBlur={() => addExpertise(expertiseInput)}
              placeholder="Ketik lalu tekan Enter — mis. Machine Learning"
              className={inputCls}
              disabled={expertise.length >= 20}
            />
            <p className="mt-1 text-xs text-slate-400">
              Tekan Enter atau koma untuk menambah. Maks 20 bidang.
            </p>
          </div>

          <div>
            <label htmlFor="institution" className="block text-sm font-medium text-slate-700">
              Institusi
            </label>
            <input
              id="institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              maxLength={180}
              className={inputCls}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="faculty" className="block text-sm font-medium text-slate-700">
                Fakultas
              </label>
              <select
                id="faculty"
                value={facultyId}
                onChange={(e) => {
                  setFacultyId(e.target.value);
                  setDepartmentId('');
                }}
                className={inputCls}
              >
                <option value="">— Pilih fakultas —</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-slate-700">
                Program studi
              </label>
              <select
                id="department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={!facultyId}
                className={`${inputCls} disabled:cursor-not-allowed disabled:bg-slate-50`}
              >
                <option value="">— Pilih program studi —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.degree ? ` (${d.degree})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-[#f8fafc] shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {busy ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
            <Link
              href="/dashboard/profil"
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
