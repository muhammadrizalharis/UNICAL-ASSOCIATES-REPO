# Pengujian UI End-to-End (Playwright)

Dokumentasi hasil uji antarmuka UNICAL ASSOCIATES REPO terhadap stack
Docker yang berjalan di server kampus (nginx `127.0.0.1:48080`).

- **Kerangka**: [Playwright](https://playwright.dev) 1.55.0 (Chromium)
- **Lokasi suite**: `frontend/e2e/`
- **Hasil terakhir**: **18/18 lulus** — 20 Agustus 2026
- **Tangkapan layar**: `frontend/e2e/dokumentasi/`

## Cara Menjalankan

Seluruh stack harus hidup (`docker compose up -d`). Lalu:

```bash
cd "UNICAL ASSOCIATES"
set -a && . ./.env && set +a   # memuat SEED_PWD_QA_USER

docker run --rm --network host \
  -u "$(id -u):$(id -g)" -e HOME=/tmp \
  -e E2E_QA_EMAIL=usrqauser@unical.assoc.id \
  -e E2E_QA_PASSWORD="$SEED_PWD_QA_USER" \
  -v "$PWD/frontend":/app -w /app \
  mcr.microsoft.com/playwright:v1.55.0-noble \
  npx playwright test
```

Laporan HTML: `frontend/e2e/report/index.html`. Tanpa
`E2E_QA_PASSWORD`, berkas `autentikasi.spec.ts` dilewati otomatis
sehingga suite tetap bisa dijalankan siapa pun terhadap halaman publik.

> Kredensial QA tidak pernah ditulis di kode; selalu lewat variabel
> lingkungan. Login hanya sekali per suite agar tidak menyentuh
> throttle 5 percobaan/menit.

## Cakupan & Hasil

### `publik.spec.ts` — tanpa login (11 uji)

| # | Uji | Verifikasi | Bukti |
|---|---|---|---|
| 0 | Landing `/welcome` | Hero + pencarian, statistik hidup, karya tersitasi teratas, CTA masuk/daftar | [00](../frontend/e2e/dokumentasi/00-landing.png) |
| 1 | Daftar publikasi | Pencarian kata kunci, faset Tahun/Jenis, kartu hasil | [01](../frontend/e2e/dokumentasi/01-publikasi-pencarian.png) |
| 2 | Pencarian per-penulis | Kolom `author` menyaring hasil | — |
| 3 | Detail publikasi | 4 tombol ekspor (BibTeX/RIS/APA/IEEE), abstrak, diskusi, meta `citation_doi` Google Scholar | [02](../frontend/e2e/dokumentasi/02-publikasi-detail.png) |
| 4 | Unduhan BibTeX | Respons berisi entri `@article{` | — |
| 5 | Profil peneliti | UNICAL ID, metrik h-index, pengikut, tren sitasi, kolaborator terdekat | [03](../frontend/e2e/dokumentasi/03-profil-peneliti.png) |
| 6 | Statistik institusi | Angka total, tabel per fakultas → laporan siap cetak | [04](../frontend/e2e/dokumentasi/04-statistik.png) · [05](../frontend/e2e/dokumentasi/05-laporan-fakultas.png) |
| 7 | Sakelar bahasa | ID → EN diterjemahkan, cookie menempel antarhalaman, kembali ke ID | [06](../frontend/e2e/dokumentasi/06-bahasa-inggris.png) |
| 8 | Kebijakan & lapor | Formulir menolak uraian < 20 karakter | [07](../frontend/e2e/dokumentasi/07-kebijakan-lapor.png) |
| 9 | PWA + security.txt | Manifest valid, `/.well-known/security.txt` 200 | — |
| 10 | Swagger | `/api/docs` merender UI dokumentasi | [08](../frontend/e2e/dokumentasi/08-swagger.png) |

### `autentikasi.spec.ts` — akun QA (6 uji, serial, 1× login)

| # | Uji | Verifikasi | Bukti |
|---|---|---|---|
| 11 | Dashboard | Kartu menu lengkap + lonceng notifikasi berbadge | [09](../frontend/e2e/dokumentasi/09-dashboard.png) |
| 12 | Keamanan | Status 2FA, daftar perangkat, penanda "sesi ini" | [10](../frontend/e2e/dokumentasi/10-keamanan.png) |
| 13 | Notifikasi | Notifikasi "Login baru" muncul, tandai semua dibaca | [11](../frontend/e2e/dokumentasi/11-notifikasi.png) |
| 14 | Koleksi | Buat koleksi → tampil → hapus | [12](../frontend/e2e/dokumentasi/12-koleksi.png) |
| 15 | Ikuti peneliti | Tombol Ikuti/Mengikuti tampil di profil orang lain | — |
| 16 | Diskusi | Kotak komentar terbuka bagi pengguna login | [13](../frontend/e2e/dokumentasi/13-diskusi-login.png) |

## Catatan Teknis

- Test berjalan **serial 1 worker** untuk menghormati rate limit API.
- Faset *Indeksasi* belum diuji karena publikasi hasil impor ORCID belum
  memiliki data indeksasi (faset kosong disembunyikan UI) — aktifkan
  kembali asersinya setelah admin mengisi indeksasi jurnal.
- Versi image Docker Playwright **harus sama persis** dengan versi
  `@playwright/test` di `frontend/package.json` (`1.55.0`).
- Uji yang bermutasi data (koleksi, tandai-dibaca) membersihkan
  jejaknya sendiri; komentar hanya diuji keterbukaannya, tidak dikirim.
