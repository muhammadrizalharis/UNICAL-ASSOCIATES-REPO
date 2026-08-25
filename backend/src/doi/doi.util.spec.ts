import {
  abstractFromInvertedIndex,
  cleanAbstract,
  dateFromParts,
  mapCrossrefType,
  normalizeDoi,
} from './doi.util';

describe('normalizeDoi', () => {
  const canonical = '10.1016/j.eswa.2024.123456';

  it.each([
    ['10.1016/j.eswa.2024.123456', canonical],
    ['https://doi.org/10.1016/j.eswa.2024.123456', canonical],
    ['http://dx.doi.org/10.1016/j.eswa.2024.123456', canonical],
    ['doi:10.1016/j.eswa.2024.123456', canonical],
    ['  10.1016/j.eswa.2024.123456  ', canonical],
    ['10.1016/J.ESWA.2024.123456', canonical],
  ])('menormalkan %s', (input, expected) => {
    expect(normalizeDoi(input)).toBe(expected);
  });

  it.each([
    ['', 'kosong'],
    ['bukan-doi', 'tanpa prefiks 10.'],
    ['10.1016', 'tanpa sufiks'],
    ['11.1016/abc', 'prefiks salah'],
  ])('menolak "%s" karena %s', (input) => {
    expect(normalizeDoi(input)).toBeNull();
  });

  it('menolak nilai null dan undefined', () => {
    expect(normalizeDoi(null)).toBeNull();
    expect(normalizeDoi(undefined)).toBeNull();
  });
});

describe('cleanAbstract', () => {
  it('membuang tag JATS dan merapikan spasi', () => {
    const raw =
      '<jats:p>Studi ini   mengusulkan</jats:p>\n<jats:p>metode baru</jats:p>';
    expect(cleanAbstract(raw)).toBe('Studi ini mengusulkan metode baru');
  });

  it('mengembalikan null untuk masukan kosong', () => {
    expect(cleanAbstract(null)).toBeNull();
    expect(cleanAbstract('   ')).toBeNull();
  });
});

describe('abstractFromInvertedIndex', () => {
  it('menyusun ulang abstrak dari indeks terbalik OpenAlex', () => {
    const index = { Deep: [0], learning: [1], untuk: [2], pendidikan: [3] };
    expect(abstractFromInvertedIndex(index)).toBe(
      'Deep learning untuk pendidikan',
    );
  });

  it('menangani kata yang muncul beberapa kali', () => {
    const index = { model: [0, 2], prediksi: [1] };
    expect(abstractFromInvertedIndex(index)).toBe('model prediksi model');
  });

  it('mengembalikan null bila indeks tidak ada', () => {
    expect(abstractFromInvertedIndex(null)).toBeNull();
  });
});

describe('mapCrossrefType', () => {
  it.each([
    ['journal-article', 'JOURNAL_ARTICLE'],
    ['proceedings-article', 'PROCEEDING'],
    ['book-chapter', 'BOOK_CHAPTER'],
    ['posted-content', 'PREPRINT'],
  ])('memetakan %s menjadi %s', (input, expected) => {
    expect(mapCrossrefType(input)).toBe(expected);
  });

  it('memakai JOURNAL_ARTICLE untuk tipe tak dikenal', () => {
    expect(mapCrossrefType('sesuatu-yang-aneh')).toBe('JOURNAL_ARTICLE');
    expect(mapCrossrefType(undefined)).toBe('JOURNAL_ARTICLE');
  });
});

describe('dateFromParts', () => {
  it('menyusun tanggal lengkap', () => {
    expect(dateFromParts([[2024, 6, 15]])).toBe('2024-06-15');
  });

  it('melengkapi bulan dan hari yang tidak disebutkan', () => {
    expect(dateFromParts([[2024]])).toBe('2024-01-01');
    expect(dateFromParts([[2024, 6]])).toBe('2024-06-01');
  });

  it('mengembalikan null bila bagian tanggal kosong', () => {
    expect(dateFromParts(undefined)).toBeNull();
    expect(dateFromParts([[]])).toBeNull();
  });
});
