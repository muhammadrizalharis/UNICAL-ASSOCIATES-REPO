import type { MetadataRoute } from 'next';
import { apiFetch } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://unical.unismuh.ac.id';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/welcome`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/publikasi`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/peneliti`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/statistik`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/kebijakan`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    const pubs = await apiFetch<{ data: { id: string }[] }>(
      '/publications?limit=100',
    );
    for (const pub of pubs.data) {
      entries.push({
        url: `${BASE}/publikasi/${pub.id}`,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  } catch {
    // API belum siap saat build; sitemap dasar tetap tersaji.
  }

  try {
    const researchers = await apiFetch<{ data: { unicalId: string }[] }>(
      '/researchers?page=1',
    );
    for (const r of researchers.data) {
      entries.push({
        url: `${BASE}/profil/${r.unicalId}`,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch {
    // sda.
  }

  return entries;
}
