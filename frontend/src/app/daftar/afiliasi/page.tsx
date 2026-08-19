'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiRequestError } from '@/lib/api';
import { authHeader, readToken, saveSession, type SessionUser } from '@/lib/session';
import { AuthShell } from '@/components/auth-shell';

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

export default function AfiliasiPage() {
  const router = useRouter();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Faculty[] }>('/institutions/faculties')
      .then((body) => setFaculties(body.data))
      .catch(() => setError('Gagal memuat daftar fakultas.'));
  }, []);

  // Autocomplete prodi mengikuti fakultas terpilih dan kata kunci.
  useEffect(() => {
    const params = new URLSearchParams();
    if (facultyId) params.set('facultyId', facultyId);
    if (query.trim()) params.set('q', query.trim());

    const timer = setTimeout(() => {
      apiFetch<{ data: Department[] }>(`/institutions/departments?${params}`)
        .then((body) => setDepartments(body.data))
        .catch(() => setDepartments([]));
    }, 250);

    return () => clearTimeout(timer);
  }, [facultyId, query]);

  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === departmentId) ?? null,
    [departments, departmentId],
  );

  async function submit(skip: boolean) {
    setLoading(true);
    setError(null);

    try {
      if (skip) {
        await apiFetch('/auth/affiliation/skip', {
          method: 'POST',
          headers: authHeader(),
        });
      } else {
        await apiFetch('/auth/affiliation', {
          method: 'PATCH',
          headers: authHeader(),
          body: JSON.stringify({
            facultyId: facultyId || undefined,
            departmentId: departmentId || undefined,
          }),
        });
      }

      // Sesi tersimpan masih versi saat login, jadi disegarkan agar dashboard
      // langsung menampilkan afiliasi yang baru saja diisi.
      const token = readToken();
      if (token) {
        const me = await apiFetch<{ data: SessionUser }>('/auth/me', {
          headers: authHeader(),
        });
        saveSession(token, me.data);
      }

      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Gagal menyimpan afiliasi.',
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Tunjukkan tempat Anda meneliti"
      subtitle="Isi fakultas dan program studi agar kolega sebidang lebih mudah menemukan Anda."
    >
      <div className="space-y-4">
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
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">Semua fakultas</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f._count.departments} prodi)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="prodi" className="block text-sm font-medium text-slate-700">
            Program studi
          </label>
          <input
            id="prodi"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik untuk mencari, misalnya: informatika"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />

          <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-200">
            {departments.length === 0 && (
              <p className="px-3 py-3 text-sm text-slate-500">
                Tidak ada program studi yang cocok.
              </p>
            )}
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDepartmentId(d.id)}
                className={`block w-full px-3 py-2 text-left text-sm transition ${
                  departmentId === d.id
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{d.name}</span>
                {d.degree && <span className="ml-1 opacity-70">({d.degree})</span>}
                <span
                  className={`block text-xs ${
                    departmentId === d.id ? 'text-indigo-100' : 'text-slate-500'
                  }`}
                >
                  {d.faculty.name}
                </span>
              </button>
            ))}
          </div>

          {selectedDepartment && (
            <p className="mt-2 text-xs text-emerald-700">
              Terpilih: {selectedDepartment.name} — {selectedDepartment.faculty.name}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => submit(false)}
          disabled={loading || !departmentId}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Menyimpan…' : 'Lanjutkan'}
        </button>

        <button
          type="button"
          onClick={() => submit(true)}
          disabled={loading}
          className="w-full text-center text-sm text-slate-500 hover:text-slate-700 hover:underline"
        >
          Lewati langkah ini
        </button>
      </div>
    </AuthShell>
  );
}
