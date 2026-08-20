import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://unical.unismuh.ac.id';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Area privat dan pintu pengelola tidak untuk mesin pencari.
        disallow: ['/dashboard', '/admin', '/masuk', '/daftar', '/welcome/', '/reset-sandi'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
