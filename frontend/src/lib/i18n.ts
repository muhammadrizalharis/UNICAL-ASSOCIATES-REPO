import { cookies } from 'next/headers';

export type Lang = 'id' | 'en';

export const LANG_COOKIE = 'unical.lang';

/** Bahasa aktif dari cookie; Indonesia adalah bawaan. */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === 'en' ? 'en' : 'id';
}

const id = {
  common: {
    back: '← Beranda',
    backToPublications: '← Jelajahi Publikasi',
    backToResearchers: '← Direktori Peneliti',
    backToStats: '← Statistik Institusi',
    search: 'Cari',
    login: 'Masuk',
    citations: 'sitasi',
    views: 'dilihat',
    publications: 'Publikasi',
    researchers: 'Peneliti',
    followers: 'pengikut',
    works: 'karya',
    year: 'Tahun',
    print: '🖨 Cetak / Simpan PDF',
  },
  publikasi: {
    title: 'Jelajahi Publikasi',
    searchPlaceholder: 'Cari judul, abstrak, atau DOI…',
    authorPlaceholder: 'Nama penulis (opsional)',
    loadFailed: 'Tidak dapat memuat hasil pencarian.',
    results: 'hasil',
    noMatch: 'Tidak ada publikasi yang cocok.',
    others: 'lainnya',
    sortRelevance: 'Relevansi',
    sortNewest: 'Terbaru',
    sortMostCited: 'Paling disitasi',
    sortMostViewed: 'Paling dilihat',
    facetIndexation: 'Indeksasi',
    facetType: 'Jenis',
    facetYear: 'Tahun',
    clearFilters: 'Hapus semua filter',
    abstract: 'Abstrak',
    abstractMissing: 'Abstrak tidak tersedia untuk publikasi ini.',
    fields: 'Bidang ilmu',
    related: 'Artikel Terkait',
    reportPrompt: 'Menemukan pelanggaran hak cipta atau penyalahgunaan?',
    reportLink: 'Laporkan di sini',
  },
  profil: {
    perYear: 'Publikasi per Tahun',
    citationTrend: 'Tren Sitasi',
    trendCaption: 'Snapshot bulanan total sitasi seluruh karya.',
    collaborators: 'Kolaborator Terdekat',
    publicationList: 'Daftar Publikasi',
    noPublications: 'Belum ada publikasi terverifikasi.',
    corresponding: 'corresponding author',
    metricCitations: 'Sitasi',
  },
  statistik: {
    title: 'Statistik Institusi',
    subtitle:
      'Kinerja riset Universitas Muhammadiyah Makassar di UNICAL ASSOCIATES REPO.',
    unavailable: 'Statistik sedang tidak tersedia. Coba lagi sebentar lagi.',
    journals: 'Jurnal',
    perYear: 'Publikasi per Tahun',
    trend: 'Tren Sitasi Institusi',
    perFaculty: 'Per Fakultas',
    faculty: 'Fakultas',
    types: 'Jenis Publikasi',
    quartile: 'Kuartil Scopus',
    unclassified: 'Belum terklasifikasi',
    topCited: 'Paling Banyak Disitasi',
    reportTitle: 'Laporan Kinerja Riset',
    reportSource:
      'Sumber data: UNICAL ASSOCIATES REPO — metrik dihitung dari publikasi terverifikasi dan pembaruan sitasi OpenAlex.',
    verifiedResearchers: 'Peneliti terverifikasi',
    authorships: 'Kepenulisan',
    department: 'Program Studi',
    generated: 'Dibuat',
  },
  peneliti: {
    title: 'Direktori Peneliti',
    searchPlaceholder: 'Cari nama peneliti…',
    empty: 'Belum ada peneliti yang cocok.',
  },
};

// Struktur EN wajib identik dengan ID agar tidak ada kunci yang lolos.
const en: typeof id = {
  common: {
    back: '← Home',
    backToPublications: '← Browse Publications',
    backToResearchers: '← Researcher Directory',
    backToStats: '← Institution Statistics',
    search: 'Search',
    login: 'Sign in',
    citations: 'citations',
    views: 'views',
    publications: 'Publications',
    researchers: 'Researchers',
    followers: 'followers',
    works: 'works',
    year: 'Year',
    print: '🖨 Print / Save as PDF',
  },
  publikasi: {
    title: 'Browse Publications',
    searchPlaceholder: 'Search title, abstract, or DOI…',
    authorPlaceholder: 'Author name (optional)',
    loadFailed: 'Unable to load search results.',
    results: 'results',
    noMatch: 'No matching publications.',
    others: 'more',
    sortRelevance: 'Relevance',
    sortNewest: 'Newest',
    sortMostCited: 'Most cited',
    sortMostViewed: 'Most viewed',
    facetIndexation: 'Indexation',
    facetType: 'Type',
    facetYear: 'Year',
    clearFilters: 'Clear all filters',
    abstract: 'Abstract',
    abstractMissing: 'No abstract is available for this publication.',
    fields: 'Subject areas',
    related: 'Related Articles',
    reportPrompt: 'Found a copyright violation or abuse?',
    reportLink: 'Report it here',
  },
  profil: {
    perYear: 'Publications per Year',
    citationTrend: 'Citation Trend',
    trendCaption: 'Monthly snapshots of total citations across all works.',
    collaborators: 'Top Collaborators',
    publicationList: 'Publications',
    noPublications: 'No verified publications yet.',
    corresponding: 'corresponding author',
    metricCitations: 'Citations',
  },
  statistik: {
    title: 'Institution Statistics',
    subtitle:
      'Research performance of Universitas Muhammadiyah Makassar on UNICAL ASSOCIATES REPO.',
    unavailable: 'Statistics are temporarily unavailable. Please try again shortly.',
    journals: 'Journals',
    perYear: 'Publications per Year',
    trend: 'Institutional Citation Trend',
    perFaculty: 'By Faculty',
    faculty: 'Faculty',
    types: 'Publication Types',
    quartile: 'Scopus Quartile',
    unclassified: 'Unclassified',
    topCited: 'Most Cited',
    reportTitle: 'Research Performance Report',
    reportSource:
      'Data source: UNICAL ASSOCIATES REPO — metrics are computed from verified publications and OpenAlex citation updates.',
    verifiedResearchers: 'Verified researchers',
    authorships: 'Authorships',
    department: 'Department',
    generated: 'Generated',
  },
  peneliti: {
    title: 'Researcher Directory',
    searchPlaceholder: 'Search researcher name…',
    empty: 'No matching researchers yet.',
  },
};

const DICTS: Record<Lang, typeof id> = { id, en };

export function dict(lang: Lang) {
  return DICTS[lang];
}

export type Dict = typeof id;
