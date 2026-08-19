import { normalizeDoi } from '../doi/doi.util';

export type IdentifierKind = 'doi' | 'arxiv' | 'pmid' | 'pmcid' | 'isbn';

export interface DetectedIdentifier {
  kind: IdentifierKind;
  value: string;
}

const ARXIV_NEW = /^(?:arxiv:)?(\d{4}\.\d{4,5})(v\d+)?$/i;
const ARXIV_OLD = /^(?:arxiv:)?([a-z-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?$/i;
const PMID = /^(?:pmid:\s*)?(\d{4,8})$/i;
const PMCID = /^(pmc\d{6,8})$/i;

/** Mengenali jenis identifier dari satu baris masukan bebas. */
export function detectIdentifier(raw: string): DetectedIdentifier | null {
  const input = raw.trim();
  if (!input) return null;

  const doi = normalizeDoi(input);
  if (doi) return { kind: 'doi', value: doi };

  const fromUrl = input.match(/arxiv\.org\/(?:abs|pdf)\/([^\s?#]+)/i);
  const arxivCandidate = fromUrl ? fromUrl[1].replace(/\.pdf$/i, '') : input;

  const arxivNew = arxivCandidate.match(ARXIV_NEW);
  if (arxivNew) return { kind: 'arxiv', value: arxivNew[1] };

  const arxivOld = arxivCandidate.match(ARXIV_OLD);
  if (arxivOld) return { kind: 'arxiv', value: arxivOld[1] };

  const pmcid = input.match(PMCID);
  if (pmcid) return { kind: 'pmcid', value: pmcid[1].toUpperCase() };

  const isbn = normalizeIsbn(input);
  if (isbn) return { kind: 'isbn', value: isbn };

  // PMID dicek terakhir karena polanya paling longgar (deretan angka saja).
  const pmid = input.match(PMID);
  if (pmid) return { kind: 'pmid', value: pmid[1] };

  return null;
}

/** ISBN-10 atau ISBN-13 dengan verifikasi digit periksa. */
export function normalizeIsbn(raw: string): string | null {
  const cleaned = raw.replace(/^isbn[:\s-]*/i, '').replace(/[\s-]/g, '');

  if (/^\d{9}[\dXx]$/.test(cleaned)) {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += (10 - i) * Number(cleaned[i]);
    const check = cleaned[9].toUpperCase() === 'X' ? 10 : Number(cleaned[9]);
    return (sum + check) % 11 === 0 ? cleaned.toUpperCase() : null;
  }

  if (/^\d{13}$/.test(cleaned)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += Number(cleaned[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === Number(cleaned[12]) ? cleaned : null;
  }

  return null;
}

/** Mengambil DOI pertama yang muncul dalam teks bebas, misalnya isi PDF. */
export function extractDoiFromText(text: string): string | null {
  const matches = text.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9<>[\]+]+/gi);
  if (!matches) return null;

  for (const candidate of matches) {
    // Tanda baca di ujung kalimat kerap ikut terbawa saat PDF diekstraksi.
    const trimmed = candidate.replace(/[.,;:)\]]+$/, '');
    const doi = normalizeDoi(trimmed);
    if (doi) return doi;
  }

  return null;
}
