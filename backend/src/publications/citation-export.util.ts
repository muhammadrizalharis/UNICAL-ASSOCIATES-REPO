export interface CitationData {
  doi: string;
  title: string;
  authors: string[];
  journal: string | null;
  year: number | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
}

function bibtexKey(data: CitationData): string {
  const surname =
    data.authors[0]
      ?.split(/\s+/)
      .at(-1)
      ?.toLowerCase()
      .replace(/[^a-z]/g, '') ?? 'unical';
  return `${surname}${data.year ?? ''}`;
}

export function toBibtex(data: CitationData): string {
  const lines = [
    `@article{${bibtexKey(data)},`,
    `  title   = {${data.title}},`,
    `  author  = {${data.authors.join(' and ')}},`,
  ];
  if (data.journal) lines.push(`  journal = {${data.journal}},`);
  if (data.year) lines.push(`  year    = {${data.year}},`);
  if (data.volume) lines.push(`  volume  = {${data.volume}},`);
  if (data.issue) lines.push(`  number  = {${data.issue}},`);
  if (data.pages) lines.push(`  pages   = {${data.pages}},`);
  lines.push(`  doi     = {${data.doi}}`, `}`);
  return lines.join('\n');
}

export function toRis(data: CitationData): string {
  const lines = ['TY  - JOUR', `TI  - ${data.title}`];
  for (const author of data.authors) lines.push(`AU  - ${author}`);
  if (data.journal) lines.push(`JO  - ${data.journal}`);
  if (data.year) lines.push(`PY  - ${data.year}`);
  if (data.volume) lines.push(`VL  - ${data.volume}`);
  if (data.issue) lines.push(`IS  - ${data.issue}`);
  if (data.pages) {
    const [start, end] = data.pages.split('-', 2);
    if (start) lines.push(`SP  - ${start.trim()}`);
    if (end) lines.push(`EP  - ${end.trim()}`);
  }
  lines.push(`DO  - ${data.doi}`, 'ER  - ');
  return lines.join('\n');
}

/** "Muhammad Rizal Haris" -> "Haris, M. R." sesuai gaya APA. */
function apaName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const surname = parts.at(-1)!;
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(' ');
  return `${surname}, ${initials}`;
}

export function toApa(data: CitationData): string {
  const names = data.authors.map(apaName);
  const authorText =
    names.length <= 1
      ? (names[0] ?? '')
      : names.length === 2
        ? `${names[0]} & ${names[1]}`
        : `${names.slice(0, -1).join(', ')}, & ${names.at(-1)}`;

  const pieces = [`${authorText} (${data.year ?? 't.t.'}).`, `${data.title}.`];
  if (data.journal) {
    let source = data.journal;
    if (data.volume) {
      source += `, ${data.volume}`;
      if (data.issue) source += `(${data.issue})`;
    }
    if (data.pages) source += `, ${data.pages}`;
    pieces.push(`${source}.`);
  }
  pieces.push(`https://doi.org/${data.doi}`);
  return pieces.join(' ');
}

/** "Muhammad Rizal Haris" -> "M. R. Haris" sesuai gaya IEEE. */
function ieeeName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(' ');
  return `${initials} ${parts.at(-1)}`;
}

export function toIeee(data: CitationData): string {
  const names = data.authors.map(ieeeName);
  const authorText =
    names.length <= 1
      ? (names[0] ?? '')
      : names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;

  const pieces = [`${authorText}, "${data.title},"`];
  if (data.journal) {
    let source = `*${data.journal}*`;
    if (data.volume) source += `, vol. ${data.volume}`;
    if (data.issue) source += `, no. ${data.issue}`;
    if (data.pages) source += `, pp. ${data.pages}`;
    pieces.push(`${source},`);
  }
  if (data.year) pieces.push(`${data.year},`);
  pieces.push(`doi: ${data.doi}.`);
  return pieces.join(' ');
}

export const EXPORT_FORMATS = {
  bibtex: { fn: toBibtex, mime: 'application/x-bibtex', ext: 'bib' },
  ris: { fn: toRis, mime: 'application/x-research-info-systems', ext: 'ris' },
  apa: { fn: toApa, mime: 'text/plain', ext: 'txt' },
  ieee: { fn: toIeee, mime: 'text/plain', ext: 'txt' },
} as const;

export type ExportFormat = keyof typeof EXPORT_FORMATS;
