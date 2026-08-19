'use client';

const TOKEN_KEY = 'unical.token';
const USER_KEY = 'unical.user';

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  profile: {
    unicalId: string | null;
    firstName: string;
    lastName: string | null;
    fullName: string;
    institution: string | null;
    faculty: string | null;
    department: string | null;
    orcid: string | null;
    isVerified: boolean;
    affiliationCompleted: boolean;
  } | null;
}

export function saveSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function readUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authHeader(): Record<string, string> {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
