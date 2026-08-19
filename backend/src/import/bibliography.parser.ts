export interface ParsedReference {
  doi: string | null;
  title: string | null;
  authors: string[];
  journal: string | null;
  year: number | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  abstract: string | null;
  keywords: string[];
  url: string | null;
  type: string | null;
}

function emptyReference(): ParsedReference {
  return {
    doi: null,
    title: null,
    authors: [],
    journal: null,
    year: null,
    volume: null,
    issue: null,
    pages: null,
    abstract: null,
    keywords: [],
    url: null,
    type: null,
  };
}

function cleanBibValue(value: string): string {
  return value
    .replace(/^[{"']+|[}"',]+$/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parser BibTeX ringkas: cukup untuk berkas ekspor Mendeley, Zotero, dan JabRef. */
export function parseBibtex(content: string): ParsedReference[] {
  const references: ParsedReference[] = [];
  const entries = content.split(/^@/m).slice(1);

  for (const entry of entries) {
    const typeMatch = entry.match(/^(\w+)\s*\{/);
    const ref = emptyReference();
    ref.type = typeMatch ? typeMatch[1].toLowerCase() : null;

    const body = entry.slice(entry.indexOf('{') + 1);
    const fieldPattern =
      /(\w+)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*"|[^,\n}]+)/g;

    let match: RegExpExecArray | null;
    while ((match = fieldPattern.exec(body)) !== null) {
      const key = match[1].toLowerCase();
      const value = cleanBibValue(match[2]);
      if (!value) continue;

      switch (key) {
        case 'doi':
          ref.doi = value;
          break;
        case 'title':
          ref.title = value;
          break;
        case 'author':
          ref.authors = value
            .split(/\s+and\s+/i)
            .map((a) => normalizeAuthorName(a))
            .filter(Boolean);
          break;
        case 'journal':
        case 'journaltitle':
        case 'booktitle':
          ref.journal = value;
          break;
        case 'year':
          ref.year = Number(value.match(/\d{4}/)?.[0]) || null;
          break;
        case 'volume':
          ref.volume = value;
          break;
        case 'number':
        case 'issue':
          ref.issue = value;
          break;
        case 'pages':
          ref.pages = value.replace(/--/g, '-');
          break;
        case 'abstract':
          ref.abstract = value;
          break;
        case 'keywords':
          ref.keywords = value
            .split(/[;,]/)
            .map((k) => k.trim())
            .filter(Boolean);
          break;
        case 'url':
          ref.url = value;
          break;
      }
    }

    if (ref.doi || ref.title) references.push(ref);
  }

  return references;
}

/** Mengubah "Haris, Muhammad Rizal" menjadi "Muhammad Rizal Haris". */
function normalizeAuthorName(raw: string): string {
  const name = raw.trim();
  if (!name.includes(',')) return name;

  const [family, given] = name.split(',', 2);
  return [given?.trim(), family?.trim()].filter(Boolean).join(' ');
}

type RisStringField =
  | 'doi'
  | 'title'
  | 'journal'
  | 'volume'
  | 'issue'
  | 'abstract'
  | 'url'
  | 'type';

const RIS_MAP: Record<string, RisStringField | 'author' | 'year'> = {
  DO: 'doi',
  TI: 'title',
  T1: 'title',
  AU: 'author',
  A1: 'author',
  JO: 'journal',
  JF: 'journal',
  T2: 'journal',
  PY: 'year',
  Y1: 'year',
  VL: 'volume',
  IS: 'issue',
  AB: 'abstract',
  N2: 'abstract',
  UR: 'url',
  TY: 'type',
};

/** Parser RIS: format ekspor EndNote, Mendeley, dan Scopus. */
export function parseRis(content: string): ParsedReference[] {
  const references: ParsedReference[] = [];
  let current = emptyReference();
  let started = false;
  let startPage: string | null = null;
  let endPage: string | null = null;

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/);
    if (!match) continue;

    const [, tag, rawValue] = match;
    const value = rawValue.trim();

    if (tag === 'TY') {
      if (started && (current.doi || current.title)) references.push(current);
      current = emptyReference();
      current.type = value.toLowerCase();
      started = true;
      startPage = null;
      endPage = null;
      continue;
    }

    if (tag === 'ER') {
      if (startPage) current.pages = endPage ? `${startPage}-${endPage}` : startPage;
      if (current.doi || current.title) references.push(current);
      current = emptyReference();
      started = false;
      startPage = null;
      endPage = null;
      continue;
    }

    if (tag === 'SP') { startPage = value; continue; }
    if (tag === 'EP') { endPage = value; continue; }
    if (tag === 'KW') { if (value) current.keywords.push(value); continue; }

    const field = RIS_MAP[tag];
    if (!field) continue;

    if (field === 'author') {
      if (value) current.authors.push(normalizeAuthorName(value));
    } else if (field === 'year') {
      current.year = Number(value.match(/\d{4}/)?.[0]) || null;
    } else {
      current[field] = value;
    }
  }

  if (started && (current.doi || current.title)) references.push(current);
  return references;
}

/** Memilih parser berdasarkan isi berkas, bukan sekadar ekstensinya. */
export function parseBibliography(content: string): ParsedReference[] {
  const looksRis = /^(TY {2}-|A1 {2}-|T1 {2}-)/m.test(content);
  if (looksRis) return parseRis(content);
  if (content.includes('@')) return parseBibtex(content);
  return [];
}
