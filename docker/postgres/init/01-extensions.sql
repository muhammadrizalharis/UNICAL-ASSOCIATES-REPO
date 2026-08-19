-- Ekstensi wajib UNICAL ASSOCIATES REPO.
-- Dijalankan otomatis hanya saat volume database masih kosong.

-- Pencocokan nama penulis yang toleran perbedaan ejaan ("M. Akram" ~ "Muh. Akram").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Pencarian tanpa memedulikan diakritik.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Konfigurasi full-text sederhana: unaccent + simple, cukup untuk judul/abstrak
-- campuran Indonesia-Inggris. Dibungkus DO block karena CREATE TEXT SEARCH
-- CONFIGURATION tidak mendukung IF NOT EXISTS.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'unical_id') THEN
        CREATE TEXT SEARCH CONFIGURATION unical_id ( COPY = simple );
        ALTER TEXT SEARCH CONFIGURATION unical_id
            ALTER MAPPING FOR hword, hword_part, word WITH unaccent, simple;
    END IF;
END
$$;
