import {
  homePathForRole,
  isGateValid,
  readGateConfig,
  tierOfRole,
  timingSafeEquals,
} from './gate.util';

const config = { admin: 'assoc=-01', superAdmin: 'assoc=-000' };

describe('tierOfRole', () => {
  it.each([
    ['MEMBER', 'member'],
    ['MODERATOR', 'admin'],
    ['FACULTY_ADMIN', 'admin'],
    ['SUPER_ADMIN', 'super_admin'],
  ])('%s masuk tingkat %s', (role, tier) => {
    expect(tierOfRole(role)).toBe(tier);
  });
});

describe('isGateValid', () => {
  it('anggota biasa hanya boleh lewat pintu umum', () => {
    expect(isGateValid('MEMBER', undefined, config)).toBe(true);
    expect(isGateValid('MEMBER', '', config)).toBe(true);
    expect(isGateValid('MEMBER', 'assoc=-01', config)).toBe(false);
    expect(isGateValid('MEMBER', 'assoc=-000', config)).toBe(false);
  });

  it('admin wajib lewat pintu admin', () => {
    expect(isGateValid('FACULTY_ADMIN', 'assoc=-01', config)).toBe(true);
    expect(isGateValid('MODERATOR', 'assoc=-01', config)).toBe(true);
    expect(isGateValid('FACULTY_ADMIN', undefined, config)).toBe(false);
    expect(isGateValid('FACULTY_ADMIN', 'assoc=-000', config)).toBe(false);
  });

  it('super admin wajib lewat pintunya sendiri', () => {
    expect(isGateValid('SUPER_ADMIN', 'assoc=-000', config)).toBe(true);
    expect(isGateValid('SUPER_ADMIN', 'assoc=-01', config)).toBe(false);
    expect(isGateValid('SUPER_ADMIN', undefined, config)).toBe(false);
  });

  it('menolak gate yang mirip tetapi tidak persis sama', () => {
    expect(isGateValid('SUPER_ADMIN', 'assoc=-0000', config)).toBe(false);
    expect(isGateValid('SUPER_ADMIN', 'ASSOC=-000', config)).toBe(false);
    expect(isGateValid('SUPER_ADMIN', ' assoc=-000 ', config)).toBe(true);
  });
});

describe('timingSafeEquals', () => {
  it('membandingkan isi, bukan panjang', () => {
    expect(timingSafeEquals('assoc=-000', 'assoc=-000')).toBe(true);
    expect(timingSafeEquals('assoc=-000', 'assoc=-001')).toBe(false);
    expect(timingSafeEquals('a', 'panjang-sekali-berbeda')).toBe(false);
  });
});

describe('readGateConfig', () => {
  it('memakai nilai bawaan bila env kosong', () => {
    expect(readGateConfig({})).toEqual({
      admin: 'assoc=-01',
      superAdmin: 'assoc=-000',
    });
  });

  it('menghormati nilai dari env', () => {
    expect(
      readGateConfig({ ADMIN_GATE: 'x=-1', SUPER_ADMIN_GATE: 'y=-2' }),
    ).toEqual({ admin: 'x=-1', superAdmin: 'y=-2' });
  });
});

describe('homePathForRole', () => {
  it('mengarahkan sesuai peran', () => {
    expect(homePathForRole('MEMBER')).toBe('/dashboard');
    expect(homePathForRole('MODERATOR')).toBe('/admin');
    expect(homePathForRole('SUPER_ADMIN')).toBe('/admin');
  });
});
