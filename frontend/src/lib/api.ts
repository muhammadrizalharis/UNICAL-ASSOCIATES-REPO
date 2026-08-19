/**
 * Di browser API dipanggil lewat jalur relatif agar satu origin dengan halaman.
 * Saat render di server, panggilan memakai nama service di jaringan Docker.
 */
const INTERNAL_BASE = process.env.INTERNAL_API_URL ?? 'http://api:8000/api/v1';
const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export function apiBase(): string {
  return typeof window === 'undefined' ? INTERNAL_BASE : PUBLIC_BASE;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiError,
  ) {
    super(error.message);
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = body?.message ?? body?.error ?? {};
    throw new ApiRequestError(response.status, {
      code: detail.code ?? 'REQUEST_FAILED',
      message:
        detail.message ??
        (Array.isArray(detail) ? detail.join(', ') : null) ??
        'Permintaan gagal diproses.',
      details: detail.details,
    });
  }

  return body as T;
}
