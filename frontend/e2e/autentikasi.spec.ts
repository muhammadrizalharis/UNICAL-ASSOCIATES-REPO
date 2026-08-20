import { test, expect, type Page } from '@playwright/test';

const SHOT = { dir: 'e2e/dokumentasi' };
const EMAIL = process.env.E2E_QA_EMAIL ?? 'usrqauser@unical.assoc.id';
const PASSWORD = process.env.E2E_QA_PASSWORD ?? '';

// Satu kali login untuk seluruh berkas ini agar tidak menyentuh throttle 5/menit.
test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  test.skip(!PASSWORD, 'E2E_QA_PASSWORD belum di-set');
  page = await browser.newPage();

  await page.goto('/masuk');
  await page.getByLabel(/Email/i).fill(EMAIL);
  await page.getByLabel(/sandi/i).fill(PASSWORD);
  await page.getByRole('button', { name: /Masuk/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 20_000 });
});

test.afterAll(async () => {
  await page?.close();
});

test.describe('Alur pengguna login (akun QA)', () => {
  test('dashboard menampilkan kartu menu + lonceng notifikasi', async () => {
    await expect(page.getByText('Keamanan')).toBeVisible();
    await expect(page.getByText('Koleksi Saya')).toBeVisible();
    await expect(page.getByTitle('Notifikasi')).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/09-dashboard.png`, fullPage: true });
  });

  test('halaman keamanan: status 2FA dan daftar perangkat', async () => {
    await page.goto('/dashboard/keamanan');
    await expect(
      page.getByRole('heading', { name: /Autentikasi Dua Faktor/ }),
    ).toBeVisible();
    await expect(page.getByText(/AKTIF|NONAKTIF/).first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Perangkat yang Login' }),
    ).toBeVisible();
    await expect(page.getByText('sesi ini')).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/10-keamanan.png`, fullPage: true });
  });

  test('notifikasi terbuka dan bisa ditandai dibaca', async () => {
    await page.goto('/dashboard/notifikasi');
    await expect(page.getByRole('heading', { name: /Notifikasi/ })).toBeVisible();
    // Login barusan memicu notifikasi keamanan.
    await expect(page.getByText('Login baru ke akun Anda').first()).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/11-notifikasi.png`, fullPage: true });

    const tandai = page.getByRole('button', { name: 'Tandai semua dibaca' });
    if (await tandai.isVisible()) await tandai.click();
  });

  test('koleksi: buat, lihat kosong, hapus', async () => {
    await page.goto('/dashboard/koleksi');
    const nama = `Uji E2E ${Date.now()}`;
    await page.getByPlaceholder('Nama koleksi baru…').fill(nama);
    await page.getByRole('button', { name: 'Buat' }).click();
    await expect(page.getByText(nama)).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/12-koleksi.png`, fullPage: true });

    await page
      .locator('li', { hasText: nama })
      .getByRole('button', { name: 'Hapus' })
      .click();
    await expect(page.getByText(nama)).toBeHidden();
  });

  test('tombol ikuti tampil di profil peneliti lain', async () => {
    await page.goto('/profil/UNICAL-26000001');
    await expect(page.getByRole('button', { name: /Ikuti|Mengikuti/ })).toBeVisible();
  });

  test('kolom komentar terbuka untuk pengguna login', async () => {
    await page.goto('/publikasi');
    await page.locator('article a').first().click();
    await page.waitForURL(/\/publikasi\/[0-9a-f-]{36}/);
    await expect(page.getByPlaceholder(/Tulis komentar/)).toBeVisible();
    await page.screenshot({ path: `${SHOT.dir}/13-diskusi-login.png`, fullPage: true });
  });
});
