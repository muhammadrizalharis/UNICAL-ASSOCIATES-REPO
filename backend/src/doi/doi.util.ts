import { ResolvedType } from './doi.types';

// Regex resmi CrossRef, diperlebar sedikit untuk sufiks yang memuat kurung siku.
const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:a-z0-9<>[\]+]+$/i;

/**
 * Menerima DOI dalam bentuk apa pun (URL, prefiks `doi:`, huruf besar, berspasi)
 * lalu mengembalikan bentuk kanonik huruf kecil. Mengembalikan null bila tidak sah.
 */
export function normalizeDoi(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const doi = raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim()
    .toLowerCase();

  return DOI_PATTERN.test(doi) ? doi : null;
}

/** Membersihkan abstrak CrossRef dari tag JATS dan spasi berlebih. */
export function cleanAbstract(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;[^&]*&gt;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 0 ? text : null;
}

/** OpenAlex menyimpan abstrak sebagai indeks terbalik kata → posisi. */
export function abstractFromInvertedIndex(
  index: Record<string, number[]> | null | undefined,
): string | null {
  if (!index) return null;

  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words[position] = word;
    }
  }

  const text = words.filter(Boolean).join(' ').trim();
  return text.length > 0 ? text : null;
}

const TYPE_MAP: Record<string, ResolvedType> = {
  'journal-article': 'JOURNAL_ARTICLE',
  'proceedings-article': 'PROCEEDING',
  'book-chapter': 'BOOK_CHAPTER',
  'reference-entry': 'BOOK_CHAPTER',
  book: 'BOOK',
  monograph: 'BOOK',
  'edited-book': 'BOOK',
  'posted-content': 'PREPRINT',
};

export function mapCrossrefType(type: string | undefined): ResolvedType {
  return TYPE_MAP[type ?? ''] ?? 'JOURNAL_ARTICLE';
}

/** CrossRef memberi tanggal sebagai [[tahun, bulan, hari]] dengan bulan/hari opsional. */
export function dateFromParts(
  parts: number[][] | undefined,
): string | null {
  const part = parts?.[0];
  if (!part || part.length === 0) return null;

  const [year, month = 1, day = 1] = part;
  if (!year) return null;

  const iso = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString().slice(0, 10);
}
