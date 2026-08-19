import {
  detectIdentifier,
  extractDoiFromText,
  normalizeIsbn,
} from './identifier.util';
import { parseBibtex, parseRis, parseBibliography } from './bibliography.parser';

describe('detectIdentifier', () => {
  it.each([
    ['10.1016/j.eswa.2024.123456', 'doi', '10.1016/j.eswa.2024.123456'],
    ['https://doi.org/10.1038/nature12373', 'doi', '10.1038/nature12373'],
    ['arXiv:2103.14030', 'arxiv', '2103.14030'],
    ['2103.14030v2', 'arxiv', '2103.14030'],
    ['https://arxiv.org/abs/1706.03762', 'arxiv', '1706.03762'],
    ['PMC3084216', 'pmcid', 'PMC3084216'],
    ['23851394', 'pmid', '23851394'],
    ['978-3-16-148410-0', 'isbn', '9783161484100'],
  ])('mengenali %s sebagai %s', (input, kind, value) => {
    expect(detectIdentifier(input)).toEqual({ kind, value });
  });

  it.each(['', 'sembarang teks', 'http://contoh.com'])(
    'menolak "%s"',
    (input) => {
      expect(detectIdentifier(input)).toBeNull();
    },
  );
});

describe('normalizeIsbn', () => {
  it('menerima ISBN-13 dan ISBN-10 yang sah', () => {
    expect(normalizeIsbn('978-3-16-148410-0')).toBe('9783161484100');
    expect(normalizeIsbn('0-306-40615-2')).toBe('0306406152');
  });

  it('menolak ISBN dengan digit periksa salah', () => {
    expect(normalizeIsbn('978-3-16-148410-1')).toBeNull();
    expect(normalizeIsbn('0-306-40615-1')).toBeNull();
  });
});

describe('extractDoiFromText', () => {
  it('menemukan DOI di tengah teks hasil ekstraksi PDF', () => {
    const text = 'Diterima 12 Mei 2024. doi: 10.1038/nature12373. Hak cipta...';
    expect(extractDoiFromText(text)).toBe('10.1038/nature12373');
  });

  it('membuang tanda baca yang ikut terbawa di akhir DOI', () => {
    expect(extractDoiFromText('lihat 10.3390/su13084314.')).toBe(
      '10.3390/su13084314',
    );
  });

  it('mengembalikan null bila tidak ada DOI', () => {
    expect(extractDoiFromText('tidak ada identifier di sini')).toBeNull();
  });
});

describe('parseBibtex', () => {
  const sample = `
@article{haris2024deep,
  title = {Deep Learning untuk Prediksi Kinerja Mahasiswa},
  author = {Haris, Muhammad Rizal and Doe, John},
  journal = {Expert Systems with Applications},
  year = {2024},
  volume = {244},
  number = {1},
  pages = {123--456},
  doi = {10.1016/j.eswa.2024.123456},
  keywords = {deep learning, pendidikan}
}
`;

  it('membaca seluruh field penting', () => {
    const [ref] = parseBibtex(sample);
    expect(ref.doi).toBe('10.1016/j.eswa.2024.123456');
    expect(ref.title).toBe('Deep Learning untuk Prediksi Kinerja Mahasiswa');
    expect(ref.year).toBe(2024);
    expect(ref.volume).toBe('244');
    expect(ref.pages).toBe('123-456');
    expect(ref.keywords).toEqual(['deep learning', 'pendidikan']);
  });

  it('membalik urutan nama "Keluarga, Depan"', () => {
    const [ref] = parseBibtex(sample);
    expect(ref.authors).toEqual(['Muhammad Rizal Haris', 'John Doe']);
  });

  it('membaca beberapa entri sekaligus', () => {
    expect(parseBibtex(sample + sample)).toHaveLength(2);
  });
});

describe('parseRis', () => {
  const sample = `TY  - JOUR
TI  - Nanometre-scale thermometry in a living cell
AU  - Kucsko, Georg
AU  - Maurer, Peter
JO  - Nature
PY  - 2013
VL  - 500
IS  - 7460
SP  - 54
EP  - 58
DO  - 10.1038/nature12373
KW  - thermometry
ER  - 
`;

  it('membaca entri RIS beserta rentang halaman', () => {
    const [ref] = parseRis(sample);
    expect(ref.doi).toBe('10.1038/nature12373');
    expect(ref.title).toBe('Nanometre-scale thermometry in a living cell');
    expect(ref.authors).toEqual(['Georg Kucsko', 'Peter Maurer']);
    expect(ref.year).toBe(2013);
    expect(ref.pages).toBe('54-58');
    expect(ref.keywords).toEqual(['thermometry']);
  });
});

describe('parseBibliography', () => {
  it('memilih parser berdasarkan isi berkas', () => {
    expect(parseBibliography('TY  - JOUR\nTI  - Judul\nER  - ')).toHaveLength(1);
    expect(
      parseBibliography('@article{a, title={Judul}, doi={10.1/x}}'),
    ).toHaveLength(1);
    expect(parseBibliography('sekadar teks biasa')).toHaveLength(0);
  });
});
