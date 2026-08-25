export type ResolvedType =
  'JOURNAL_ARTICLE' | 'PROCEEDING' | 'BOOK_CHAPTER' | 'BOOK' | 'PREPRINT';

export interface ResolvedAuthor {
  name: string;
  order: number;
  isCorresponding: boolean;
  affiliation: string | null;
  /// Diisi bila CrossRef menyertakan ORCID penulis; kunci pencocokan akun.
  orcid: string | null;
}

export interface ResolvedJournal {
  name: string | null;
  publisher: string | null;
  issn: string | null;
  eissn: string | null;
}

export interface ResolvedPublication {
  doi: string;
  title: string;
  abstract: string | null;
  type: ResolvedType;
  journal: ResolvedJournal;
  authors: ResolvedAuthor[];
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publishedDate: string | null;
  keywords: string[];
  url: string | null;
  citationCount: number;
  isOpenAccess: boolean;
  /// Sumber tiap bagian metadata, dipakai untuk audit dan tampilan preview.
  sources: {
    metadata: 'crossref' | 'datacite';
    abstract: 'crossref' | 'openalex' | 'semanticscholar' | null;
  };
  raw: unknown;
}
