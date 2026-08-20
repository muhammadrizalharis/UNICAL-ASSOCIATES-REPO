import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'UNICAL ASSOCIATES REPO — Repositori Publikasi Ilmiah Unismuh Makassar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Kartu Open Graph saat tautan dibagikan ke media sosial / WhatsApp. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: 'linear-gradient(135deg, #020617 0%, #1e1b4b 60%, #312e81 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            U
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
              UNICAL ASSOCIATES REPO
            </div>
            <div style={{ fontSize: 18, color: '#a5b4fc' }}>
              UNIsmuh Catalog of Academic Literature
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 980,
          }}
        >
          Repositori Publikasi Ilmiah Universitas Muhammadiyah Makassar
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 24,
            color: '#cbd5e1',
            maxWidth: 900,
          }}
        >
          Tempel DOI → metadata terisi otomatis · metrik sitasi harian · ekspor
          BibTeX/RIS/APA/IEEE
        </div>

        <div
          style={{
            marginTop: 48,
            display: 'flex',
            gap: 14,
            fontSize: 20,
            color: '#a5b4fc',
          }}
        >
          <div style={{ padding: '8px 20px', border: '1px solid #4338ca', borderRadius: 999 }}>
            CrossRef
          </div>
          <div style={{ padding: '8px 20px', border: '1px solid #4338ca', borderRadius: 999 }}>
            OpenAlex
          </div>
          <div style={{ padding: '8px 20px', border: '1px solid #4338ca', borderRadius: 999 }}>
            ORCID
          </div>
          <div style={{ padding: '8px 20px', border: '1px solid #4338ca', borderRadius: 999 }}>
            Google Scholar
          </div>
        </div>
      </div>
    ),
    size,
  );
}
