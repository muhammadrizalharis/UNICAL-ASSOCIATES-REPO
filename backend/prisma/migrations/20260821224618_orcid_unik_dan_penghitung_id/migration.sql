-- CreateTable
CREATE TABLE "unical_id_counters" (
    "year" VARCHAR(2) NOT NULL,
    "last_seq" INTEGER NOT NULL,

    CONSTRAINT "unical_id_counters_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "researcher_profiles_orcid_key" ON "researcher_profiles"("orcid");

-- Backfill: penghitung mengambil nomor tertinggi yang pernah terbit
-- agar UNICAL ID milik akun yang sudah dihapus tidak pernah didaur ulang.
INSERT INTO "unical_id_counters" ("year", "last_seq")
SELECT SUBSTRING(unical_id FROM 8 FOR 2) AS year,
       MAX(SUBSTRING(unical_id FROM 10)::int) AS last_seq
FROM researcher_profiles
WHERE unical_id ~ '^UNICAL-[0-9]{8}$'
GROUP BY 1
ON CONFLICT ("year") DO UPDATE
SET "last_seq" = GREATEST("unical_id_counters"."last_seq", EXCLUDED."last_seq");
