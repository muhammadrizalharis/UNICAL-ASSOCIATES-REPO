import { test, expect } from '@playwright/test';

const SHOT = { dir: 'e2e/dokumentasi' };

test.describe('Halaman publik', () => {
  test('landing /welcome: hero, statistik hidup, karya teratas, CTA', async ({ page }) => {
    await page.goto('/welcome');
    await expect(
      page.getByRole('heading', { name: /Repositori Publikasi Ilmiah/ }),
    ).toBeVisible();
    await expect(page.getByText('Publikasi Terverifikasi')).toBeVisible();
    await expect(page.getByText('Paling Banyak Disitasi')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Daftar Sekarang' }).first(),
    ).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/00-landing.png`, fullPage: true });

    // Pencarian hero mengarah ke halaman jelajah.
    await page.getByPlaceholder(/Cari judul, kata kunci/).fill('clustering');
    await page.getByRole('button', { name: 'Telusuri' }).click();
    await page.waitForURL(/\/publikasi\?q=clustering/);
  });

  test('daftar publikasi: pencarian, faset, dan hasil', async ({ page }) => {
    await page.goto('/publikasi');
    await expect(page.getByRole('heading', { name: 'Jelajahi Publikasi' })).toBeVisible();

    // Pencarian kata kunci.
    await page.getByPlaceholder('Cari judul, abstrak, atau DOI…').fill('clustering');
    await page.getByRole('button', { name: 'Cari' }).click();
    await expect(page.locator('article').first()).toBeVisible();

    // Faset tahun tampil dari Meilisearch (judul faset berupa teks, bukan heading).
    await expect(page.getByText('Tahun', { exact: true })).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/01-publikasi-pencarian.png`, fullPage: true });
  });

  test('pencarian per-penulis menyaring hasil', async ({ page }) => {
    await page.goto('/publikasi');
    await page.getByPlaceholder('Nama penulis (opsional)').fill('Muhammad Faisal');
    await page.getByRole('button', { name: 'Cari' }).click();
    await expect(page.locator('article').first()).toBeVisible();
    await expect(page.getByText(/hasil/)).toBeVisible();
  });

  test('detail publikasi: ekspor, terkait, diskusi, dan meta Scholar', async ({ page, request }) => {
    // Ambil id lewat API agar tidak bergantung urutan daftar.
    const list = await request.get('/api/v1/publications?limit=1');
    const id = (await list.json()).data[0].id as string;
    await page.goto(`/publikasi/${id}`);

    // Tombol ekspor 4 format (nama aksesibel mengikuti teks asli huruf kecil).
    for (const format of ['bibtex', 'ris', 'apa', 'ieee']) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${format}$`, 'i') }),
      ).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Abstrak' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Diskusi/ })).toBeVisible();

    // Meta tag Highwire Press untuk Google Scholar.
    const metaDoi = page.locator('meta[name="citation_doi"]');
    await expect(metaDoi).toHaveAttribute('content', /10\./);

    await page.screenshot({ path: `${SHOT.dir}/02-publikasi-detail.png`, fullPage: true });
  });

  test('unduhan ekspor BibTeX berisi entri @article', async ({ page, request }) => {
    await page.goto('/publikasi');
    const href = await page
      .locator('article a')
      .first()
      .getAttribute('href');
    const id = href!.split('/').pop();
    const res = await request.get(`/api/v1/publications/${id}/export?format=bibtex`);
    expect(res.ok()).toBeTruthy();
    expect(await res.text()).toContain('@article{');
  });

  test('profil peneliti: metrik, tren sitasi, kolaborator, kontributor', async ({ page }) => {
    await page.goto('/profil/UNICAL-26000001');
    await expect(page.getByText('UNICAL-26000001')).toBeVisible();
    await expect(page.getByText('h-index')).toBeVisible();
    await expect(page.getByText(/pengikut/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kolaborator Terdekat' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Daftar Publikasi/ })).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/03-profil-peneliti.png`, fullPage: true });
  });

  test('statistik institusi + laporan fakultas siap cetak', async ({ page }) => {
    await page.goto('/statistik');
    await expect(page.getByRole('heading', { name: 'Statistik Institusi' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Fakultas Teknik' }),
    ).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/04-statistik.png`, fullPage: true });

    // Klik nama fakultas membuka laporan kinerja.
    await page.getByRole('link', { name: 'Fakultas Teknik' }).click();
    await page.waitForURL(/\/statistik\/fakultas\//);
    await expect(page.getByText('Laporan Kinerja Riset')).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak/ })).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/05-laporan-fakultas.png`, fullPage: true });
  });

  test('mode gelap: toggle, persisten setelah reload, dan berlaku lintas halaman', async ({ page }) => {
    await page.goto('/publikasi');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Aktifkan mode gelap' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({ path: `${SHOT.dir}/14-mode-gelap.png`, fullPage: true });

    // Preferensi menempel lewat localStorage saat reload dan pindah halaman.
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.goto('/statistik');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Aktifkan mode terang' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('sakelar bahasa ID → EN menerjemahkan antarmuka', async ({ page }) => {
    await page.goto('/publikasi');
    await expect(page.getByRole('heading', { name: 'Jelajahi Publikasi' })).toBeVisible();

    await page.getByRole('button', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { name: 'Browse Publications' })).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/06-bahasa-inggris.png`, fullPage: true });

    // Pilihan bahasa menempel lewat cookie saat pindah halaman.
    await page.goto('/statistik');
    await expect(page.getByRole('heading', { name: 'Institution Statistics' })).toBeVisible();

    await page.getByRole('button', { name: 'ID' }).click();
    await expect(page.getByRole('heading', { name: 'Statistik Institusi' })).toBeVisible();
  });

  test('kebijakan: formulir laporan memvalidasi isian pendek', async ({ page }) => {
    await page.goto('/kebijakan');
    await expect(page.getByRole('heading', { name: 'Kebijakan & Pelaporan' })).toBeVisible();

    const kirim = page.getByRole('button', { name: 'Kirim Laporan' });
    await expect(kirim).toBeDisabled();
    await page.getByPlaceholder(/Jelaskan pelanggaran/).fill('terlalu pendek');
    await expect(kirim).toBeDisabled();
    await page.screenshot({ path: `${SHOT.dir}/07-kebijakan-lapor.png`, fullPage: true });
  });

  test('PWA manifest dan security.txt tersedia', async ({ request }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBeTruthy();
    expect((await manifest.json()).name).toContain('UNICAL');

    const sec = await request.get('/.well-known/security.txt');
    expect(sec.ok()).toBeTruthy();
    expect(await sec.text()).toContain('Contact:');
  });

  test('dokumentasi API Swagger terbuka', async ({ page }) => {
    await page.goto('/api/docs');
    await expect(page.locator('.swagger-ui').first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: `${SHOT.dir}/08-swagger.png` });
  });
});
