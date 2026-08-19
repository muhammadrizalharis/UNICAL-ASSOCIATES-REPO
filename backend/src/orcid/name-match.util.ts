/**
 * Pencocokan nama penulis yang tahan terhadap gelar akademik.
 *
 * Metadata CrossRef biasanya memuat nama polos ("Muhammad Faisal"),
 * sedangkan profil ORCID kerap memakai nama resmi bergelar
 * ("Assoc. Prof. Ir. Muhammad Faisal, Ph.D., IPM"). Keduanya harus
 * dianggap orang yang sama tanpa menyamakan orang berbeda
 * ("Faisal Akib").
 */

/** Gelar akademik/profesi yang lazim menempel di nama Indonesia. */
const TITLE_TOKENS = new Set([
  'assoc', 'prof', 'professor', 'ir', 'dr', 'drs', 'dra', 'ph', 'phd', 'd',
  'ipm', 'ipu', 'eng', 'st', 'mt', 'se', 'mm', 'sh', 'mh', 'ssi', 'msi',
  'skom', 'mkom', 'spd', 'mpd', 'med', 'msc', 'bsc', 'mba', 'hum', 'ak',
  'ca', 'sc', 'si', 'kom', 'pd', 'ti', 'ag', 'sos', 'ans', 'ip', 'mag',
]);

/** Token inti nama: alfabetik, bukan gelar, minimal 2 huruf. */
export function coreNameTokens(name: string): Set<string> {
  const tokens = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !TITLE_TOKENS.has(t));
  return new Set(tokens);
}

/**
 * Cocok bila token inti nama yang lebih pendek merupakan himpunan bagian
 * dari yang lebih panjang, dengan minimal dua kata beririsan.
 */
export function namesLooselyMatch(a: string, b: string): boolean {
  const setA = coreNameTokens(a);
  const setB = coreNameTokens(b);
  if (setA.size === 0 || setB.size === 0) return false;

  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  let overlap = 0;
  for (const token of small) {
    if (!large.has(token)) return false;
    overlap++;
  }
  return overlap >= 2;
}
