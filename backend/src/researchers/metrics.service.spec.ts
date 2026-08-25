import { MetricsService } from './metrics.service';

describe('MetricsService.hIndex', () => {
  it('menghitung contoh dari dokumen rancangan', () => {
    // [25, 17, 9, 6, 5, 3, 1] -> lima publikasi dengan sitasi minimal 5.
    expect(MetricsService.hIndex([25, 17, 9, 6, 5, 3, 1])).toBe(5);
  });

  it('tidak bergantung urutan masukan', () => {
    expect(MetricsService.hIndex([1, 5, 25, 3, 9, 17, 6])).toBe(5);
  });

  it.each([
    [[], 0],
    [[0, 0, 0], 0],
    [[1], 1],
    [[100], 1],
    [[1, 1, 1], 1],
    [[3, 3, 3], 3],
    [[10, 8, 5, 4, 3], 4],
  ])('h-index dari %j adalah %i', (citations, expected) => {
    expect(MetricsService.hIndex(citations)).toBe(expected);
  });

  it('tidak melebihi jumlah publikasi', () => {
    expect(MetricsService.hIndex([500, 400, 300])).toBe(3);
  });
});

describe('MetricsService.i10Index', () => {
  it('menghitung publikasi dengan sitasi minimal sepuluh', () => {
    expect(MetricsService.i10Index([25, 17, 10, 9, 1])).toBe(3);
  });

  it('mengembalikan nol bila tidak ada yang mencapai sepuluh', () => {
    expect(MetricsService.i10Index([9, 5, 0])).toBe(0);
    expect(MetricsService.i10Index([])).toBe(0);
  });
});
