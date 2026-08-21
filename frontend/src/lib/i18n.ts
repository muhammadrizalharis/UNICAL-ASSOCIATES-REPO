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
  tentang: {
    navLabel: 'Tentang',
    title: 'Tentang UNICAL ASSOCIATES REPO',
    subtitle:
      'Repositori publikasi ilmiah resmi Universitas Muhammadiyah Makassar.',
    aboutTitle: 'Apa itu UNICAL?',
    aboutBody:
      'UNICAL (UNIsmuh Catalog of Academic Literature) menghimpun, memverifikasi, dan memetakan karya ilmiah sivitas akademika — artikel jurnal, prosiding, dan buku — dalam satu katalog terbuka. Metadata diambil otomatis dari DOI sehingga akurat dan konsisten, lalu ditinjau moderator sebelum tayang.',
    idTitle: 'UNICAL ID',
    idBody:
      'Setiap peneliti terverifikasi menerima UNICAL ID — identitas permanen (format UNICAL-YYNNNNNN) yang menautkan seluruh karya, metrik sitasi, h-index, dan profil publiknya. ID tidak pernah didaur ulang dan dapat disandingkan dengan ORCID.',
    dataTitle: 'Sumber Data & Metrik',
    dataBody:
      'Metadata publikasi bersumber dari CrossRef dan DataCite; abstrak dan jumlah sitasi diperkaya dari OpenAlex dan diperbarui otomatis setiap malam. Profil dapat disinkronkan dengan ORCID, dan setiap halaman publikasi memuat meta tag Google Scholar.',
    openTitle: 'Akses Terbuka',
    openBody:
      'Seluruh katalog dapat dijelajahi tanpa akun, tersedia dwibahasa (ID/EN), dilengkapi API publik terdokumentasi, ekspor sitasi BibTeX/RIS/APA/IEEE, serta PDF akses terbuka bila haknya tersedia.',
    teamTitle: 'Pengelola',
    teamBody:
      'Dikembangkan dan dikelola oleh Program Studi Informatika, Fakultas Teknik, Universitas Muhammadiyah Makassar.',
    contactTitle: 'Kontak',
  },
  landing: {
    tagline: 'UNIsmuh Catalog of Academic Literature',
    badge: 'Repositori Institusi Resmi · Akses Terbuka',
    heroTitle: 'Repositori Publikasi Ilmiah Universitas Muhammadiyah Makassar',
    heroSubtitle:
      'Telusuri karya ilmiah sivitas akademika: artikel jurnal, prosiding, dan buku — lengkap dengan metrik sitasi yang diperbarui otomatis.',
    searchPlaceholder: 'Cari judul, kata kunci, penulis, atau DOI…',
    searchButton: 'Telusuri',
    popular: 'Populer:',
    howTitle: 'Publikasikan dalam Tiga Langkah',
    how1: 'Tempel DOI',
    how1Body: 'Satu DOI cukup — judul, penulis, jurnal, dan abstrak terisi sendiri.',
    how2: 'Moderasi Cepat',
    how2Body: 'Tim moderator memverifikasi keaslian karya sebelum tayang.',
    how3: 'Terindeks & Tersitasi',
    how3Body: 'Karya tampil publik, terindeks Google Scholar, sitasi diperbarui tiap malam.',
    topResearchers: 'Peneliti Teratas',
    statPublications: 'Publikasi Terverifikasi',
    statCitations: 'Total Sitasi',
    statResearchers: 'Peneliti Ber-UNICAL ID',
    statJournals: 'Jurnal',
    topCited: 'Paling Banyak Disitasi',
    seeAll: 'Lihat semua →',
    featureTitle: 'Kenapa UNICAL ASSOCIATES REPO?',
    featureDoi: 'Tempel DOI, Semua Terisi',
    featureDoiBody:
      'Metadata lengkap diambil otomatis dari CrossRef, DataCite, dan OpenAlex — tanpa mengetik manual.',
    featureId: 'UNICAL ID & Metrik Riset',
    featureIdBody:
      'Identitas peneliti permanen dengan h-index, i10-index, dan tren sitasi yang dihitung otomatis.',
    featureExport: 'Ekspor Sitasi 4 Format',
    featureExportBody:
      'BibTeX, RIS, APA, dan IEEE siap unduh dari setiap halaman publikasi.',
    featureOpen: 'Akses Terbuka',
    featureOpenBody:
      'PDF open-access, API publik terdokumentasi, dan pencarian dwibahasa untuk semua orang.',
    ctaTitle: 'Sivitas akademika Unismuh Makassar?',
    ctaBody:
      'Daftarkan diri, klaim karya Anda, dan bangun rekam jejak riset yang terverifikasi.',
    ctaRegister: 'Daftar Sekarang',
    ctaLogin: 'Masuk',
    ctaPoint1: 'Klaim karya Anda dengan sekali klik',
    ctaPoint2: 'Metrik sitasi & h-index dihitung otomatis',
    ctaPoint3: 'Profil peneliti publik dengan UNICAL ID permanen',
    loginCardTitle: 'Masuk ke Repositori',
    loginCardHint: 'Gunakan email institusi Anda.',
    footerPolicy: 'Kebijakan & Pelaporan',
    footerStats: 'Statistik Institusi',
    footerApi: 'Dokumentasi API',
    footerDesc:
      'Repositori publikasi ilmiah resmi Universitas Muhammadiyah Makassar — menghimpun, memverifikasi, dan memetakan rekam jejak riset sivitas akademika.',
    footerRepo: 'Repositori',
    footerServices: 'Layanan',
    footerLegal: 'Ketentuan',
    footerAddress: 'Alamat',
    footerContact: 'Kontak',
    footerSources: 'Sumber Data Terbuka',
    footerManaged: 'Dikelola Program Studi Informatika · Fakultas Teknik',
    footerRights: 'Hak cipta setiap publikasi tetap milik penulis dan penerbitnya.',
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
  tentang: {
    navLabel: 'About',
    title: 'About UNICAL ASSOCIATES REPO',
    subtitle:
      'The official scientific publication repository of Universitas Muhammadiyah Makassar.',
    aboutTitle: 'What is UNICAL?',
    aboutBody:
      'UNICAL (UNIsmuh Catalog of Academic Literature) collects, verifies, and maps the scholarly output of our academic community — journal articles, proceedings, and books — in one open catalogue. Metadata is fetched automatically from DOIs for accuracy and consistency, then reviewed by moderators before going live.',
    idTitle: 'UNICAL ID',
    idBody:
      'Every verified researcher receives a UNICAL ID — a permanent identity (format UNICAL-YYNNNNNN) linking all of their works, citation metrics, h-index, and public profile. IDs are never recycled and can be paired with ORCID.',
    dataTitle: 'Data Sources & Metrics',
    dataBody:
      'Publication metadata comes from CrossRef and DataCite; abstracts and citation counts are enriched from OpenAlex and refreshed automatically every night. Profiles can be synchronised with ORCID, and every publication page carries Google Scholar meta tags.',
    openTitle: 'Open Access',
    openBody:
      'The entire catalogue is browsable without an account, available in two languages (ID/EN), with a documented public API, BibTeX/RIS/APA/IEEE citation export, and open-access PDFs where rights allow.',
    teamTitle: 'Maintainers',
    teamBody:
      'Developed and maintained by the Informatics Study Program, Faculty of Engineering, Universitas Muhammadiyah Makassar.',
    contactTitle: 'Contact',
  },
  landing: {
    tagline: 'UNIsmuh Catalog of Academic Literature',
    badge: 'Official Institutional Repository · Open Access',
    heroTitle: 'Scientific Publication Repository of Universitas Muhammadiyah Makassar',
    heroSubtitle:
      'Explore the academic output of our community: journal articles, proceedings, and books — with automatically updated citation metrics.',
    searchPlaceholder: 'Search title, keywords, author, or DOI…',
    searchButton: 'Explore',
    popular: 'Popular:',
    howTitle: 'Publish in Three Steps',
    how1: 'Paste a DOI',
    how1Body: 'One DOI is enough — title, authors, journal, and abstract fill themselves.',
    how2: 'Fast Moderation',
    how2Body: 'Moderators verify authenticity before your work goes live.',
    how3: 'Indexed & Cited',
    how3Body: 'Works go public, indexed by Google Scholar, citations refreshed nightly.',
    topResearchers: 'Top Researchers',
    statPublications: 'Verified Publications',
    statCitations: 'Total Citations',
    statResearchers: 'Researchers with UNICAL ID',
    statJournals: 'Journals',
    topCited: 'Most Cited',
    seeAll: 'See all →',
    featureTitle: 'Why UNICAL ASSOCIATES REPO?',
    featureDoi: 'Paste a DOI, Everything Fills In',
    featureDoiBody:
      'Complete metadata is fetched automatically from CrossRef, DataCite, and OpenAlex — no manual typing.',
    featureId: 'UNICAL ID & Research Metrics',
    featureIdBody:
      'A permanent researcher identity with automatically computed h-index, i10-index, and citation trends.',
    featureExport: 'Citation Export in 4 Formats',
    featureExportBody:
      'BibTeX, RIS, APA, and IEEE ready to download from every publication page.',
    featureOpen: 'Open Access',
    featureOpenBody:
      'Open-access PDFs, a documented public API, and bilingual search for everyone.',
    ctaTitle: 'Part of Unismuh Makassar academic community?',
    ctaBody:
      'Register, claim your works, and build a verified research track record.',
    ctaRegister: 'Register Now',
    ctaLogin: 'Sign in',
    ctaPoint1: 'Claim your works in one click',
    ctaPoint2: 'Citation metrics & h-index computed automatically',
    ctaPoint3: 'A public researcher profile with a permanent UNICAL ID',
    loginCardTitle: 'Sign in to the Repository',
    loginCardHint: 'Use your institutional email.',
    footerPolicy: 'Policy & Reporting',
    footerStats: 'Institution Statistics',
    footerApi: 'API Documentation',
    footerDesc:
      'The official scientific publication repository of Universitas Muhammadiyah Makassar — collecting, verifying, and mapping the research track record of our academic community.',
    footerRepo: 'Repository',
    footerServices: 'Services',
    footerLegal: 'Terms',
    footerAddress: 'Address',
    footerContact: 'Contact',
    footerSources: 'Open Data Sources',
    footerManaged: 'Managed by Informatics Study Program · Faculty of Engineering',
    footerRights: 'Copyright of each publication remains with its authors and publishers.',
  },
};

const DICTS: Record<Lang, typeof id> = { id, en };

export function dict(lang: Lang) {
  return DICTS[lang];
}

export type Dict = typeof id;
