import { coreNameTokens, namesLooselyMatch } from './name-match.util';

describe('coreNameTokens', () => {
  it('membuang gelar akademik dan tanda baca', () => {
    expect(
      coreNameTokens('Assoc. Prof. Ir. Muhammad Faisal, Ph.D., IPM'),
    ).toEqual(new Set(['muhammad', 'faisal']));
  });

  it('menormalkan diakritik', () => {
    expect(coreNameTokens('Andi Mawaddah Warahmah Bandaso')).toEqual(
      coreNameTokens('Andi Mawaddah Warahmah Bandasó'),
    );
  });
});

describe('namesLooselyMatch', () => {
  it('mencocokkan nama polos dengan nama bergelar (regresi duplikat penulis)', () => {
    expect(
      namesLooselyMatch(
        'Muhammad Faisal',
        'Assoc. Prof. Ir. Muhammad Faisal, Ph.D., IPM',
      ),
    ).toBe(true);
  });

  it('tidak peduli urutan kata', () => {
    expect(namesLooselyMatch('Faisal Muhammad', 'Muhammad Faisal')).toBe(true);
  });

  it('menolak orang berbeda yang berbagi satu kata', () => {
    expect(namesLooselyMatch('Faisal Akib', 'Muhammad Faisal')).toBe(false);
  });

  it('menolak irisan hanya satu kata meski subset', () => {
    expect(namesLooselyMatch('Faisal', 'Muhammad Faisal')).toBe(false);
  });

  it('menolak nama kosong atau hanya gelar', () => {
    expect(namesLooselyMatch('', 'Muhammad Faisal')).toBe(false);
    expect(namesLooselyMatch('Dr. Ir. S.T.', 'Muhammad Faisal')).toBe(false);
  });

  it('mencocokkan subset nama panjang', () => {
    expect(
      namesLooselyMatch('Nur Adnan', 'Dr. Nur Adnan Baharuddin, S.Kom., M.T.'),
    ).toBe(true);
  });
});
