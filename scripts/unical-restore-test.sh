#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Uji pemulihan (restore drill) UNICAL ASSOCIATES REPO.
# Membuktikan cadangan benar-benar bisa dikembalikan TANPA menyentuh data live:
#   1) pg_restore dump DB terbaru ke basis data sementara, bandingkan jumlah baris
#   2) periksa arsip MinIO valid dan hitung objeknya
#   3) pastikan bucket MinIO saat ini benar termirror (objek terbaca)
# Basis data sementara selalu dihapus di akhir.
# ---------------------------------------------------------------------------
set -uo pipefail
cd "$(dirname "$0")/.."

BK="$HOME/unical-backups"
DUMP=$(ls -t "$BK"/unical-db-*.dump 2>/dev/null | head -1)
TAR=$(ls -t "$BK"/unical-minio-*.tar.gz 2>/dev/null | head -1)
SCRATCH=unical_restore_test

if [ -z "$DUMP" ]; then
  echo "GAGAL: tidak ada dump DB di $BK" >&2
  exit 1
fi
echo "Dump DB   : $(basename "$DUMP") ($(du -h "$DUMP" | cut -f1))"
[ -n "$TAR" ] && echo "Arsip MinIO: $(basename "$TAR") ($(du -h "$TAR" | cut -f1))"
echo

echo "== 1) Restore dump ke basis data sementara =="
docker exec unical-postgres psql -U unical -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH;" >/dev/null
docker exec unical-postgres psql -U unical -d postgres -c "CREATE DATABASE $SCRATCH;" >/dev/null
docker exec -i unical-postgres pg_restore -U unical -d "$SCRATCH" --no-owner --no-privileges < "$DUMP" 2>/dev/null

echo "== 2) Perbandingan jumlah baris (live vs hasil restore) =="
STATUS=0
for T in users researcher_profiles publications publication_authors journals; do
  LIVE=$(docker exec unical-postgres psql -U unical -d unical -tAc "SELECT count(*) FROM $T;" 2>/dev/null | tr -d '[:space:]')
  REST=$(docker exec unical-postgres psql -U unical -d "$SCRATCH" -tAc "SELECT count(*) FROM $T;" 2>/dev/null | tr -d '[:space:]')
  if [ "$LIVE" = "$REST" ]; then MARK="OK"; else MARK="BEDA"; STATUS=1; fi
  printf '   %-22s live=%-5s restore=%-5s %s\n' "$T" "$LIVE" "$REST" "$MARK"
done

docker exec unical-postgres psql -U unical -d postgres -c "DROP DATABASE $SCRATCH;" >/dev/null
echo "   (basis data sementara dihapus)"
echo

echo "== 3) Arsip MinIO & mirror bucket saat ini =="
if [ -n "$TAR" ]; then
  if tar tzf "$TAR" >/dev/null 2>&1; then
    echo "   arsip valid; objek di arsip: $(tar tzf "$TAR" 2>/dev/null | grep -vc '/$')"
  else
    echo "   GAGAL: arsip MinIO rusak"; STATUS=1
  fi
fi
MINIO_USER=$(grep '^MINIO_ROOT_USER=' .env | cut -d= -f2- | tr -d '"\r\n ')
MINIO_PASS=$(grep '^MINIO_ROOT_PASSWORD=' .env | cut -d= -f2- | tr -d '"\r\n ')
MINIO_BUCKET=$(grep '^MINIO_BUCKET=' .env | cut -d= -f2- | tr -d '"\r\n ')
MINIO_BUCKET=${MINIO_BUCKET:-unical-assets}
NOW=$(docker run --rm --network unical-net --entrypoint sh minio/mc:latest -c \
  "mc alias set local http://minio:9000 '$MINIO_USER' '$MINIO_PASS' >/dev/null 2>&1 && mc ls --recursive local/$MINIO_BUCKET 2>/dev/null | wc -l")
echo "   objek di bucket live sekarang: ${NOW:-?}"
echo

[ "$STATUS" = 0 ] && echo "HASIL: pemulihan terverifikasi." || echo "HASIL: ADA KETIDAKCOCOKAN — periksa di atas."
exit "$STATUS"
