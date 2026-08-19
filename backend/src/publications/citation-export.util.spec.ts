import { toApa, toBibtex, toRis } from './citation-export.util';

const data = {
  doi: '10.18280/ijsdp.210613',
  title: 'Hybrid PCA-FCM Clustering for Provincial Rice Distribution',
  authors: ['Muhammad Faisal', 'Muhammad Rizal Haris'],
  journal: 'International Journal of Sustainable Development and Planning',
  year: 2026,
  volume: '21',
  issue: '6',
  pages: '113-125',
};

describe('toBibtex', () => {
  it('menyusun entri lengkap dengan kunci nama-tahun', () => {
    const out = toBibtex(data);
    expect(out).toContain('@article{faisal2026,');
    expect(out).toContain('author  = {Muhammad Faisal and Muhammad Rizal Haris}');
    expect(out).toContain('doi     = {10.18280/ijsdp.210613}');
    expect(out.trim().endsWith('}')).toBe(true);
  });

  it('melewatkan field yang kosong', () => {
    const out = toBibtex({ ...data, journal: null, pages: null, issue: null });
    expect(out).not.toContain('journal');
    expect(out).not.toContain('pages');
  });
});

describe('toRis', () => {
  it('memecah halaman menjadi SP dan EP', () => {
    const out = toRis(data);
    expect(out).toContain('SP  - 113');
    expect(out).toContain('EP  - 125');
    expect(out).toContain('AU  - Muhammad Faisal');
    expect(out.trim().endsWith('ER  -')).toBe(true);
  });
});

describe('toApa', () => {
  it('membalik nama menjadi inisial gaya APA', () => {
    const out = toApa(data);
    expect(out).toContain('Faisal, M. & Haris, M. R. (2026).');
    expect(out).toContain('21(6), 113-125.');
    expect(out).toContain('https://doi.org/10.18280/ijsdp.210613');
  });

  it('memakai t.t. bila tahun tidak diketahui', () => {
    expect(toApa({ ...data, year: null })).toContain('(t.t.)');
  });
});
