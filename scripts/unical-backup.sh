#!/usr/bin/env bash
# Backup harian UNICAL ASSOCIATES REPO (PostgreSQL + MinIO) di server kampus.
# Dipanggil cron tiap malam; simpan 14 salinan terakhir di ~/unical-backups.
#
# Tidak butuh pg_dump lokal: dump dijalankan di dalam container postgres.
# Opsional: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID di .env untuk notifikasi,
# dan remote rclone "gdrive:" untuk salinan luar server.
set -u

PROJECT_DIR="$HOME/UNICAL ASSOCIATES"
DIR="$HOME/unical-backups"
LOG="$HOME/.unical-backup.log"
APP_ENV="$PROJECT_DIR/.env"
KEEP=14

log() { echo "$(date -Is) $*" >> "$LOG"; }

tg_notify() {
  local TOKEN CHAT
  TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$APP_ENV" 2>/dev/null | cut -d= -f2- | tr -d '"\r\n ')
  CHAT=$(grep '^TELEGRAM_CHAT_ID=' "$APP_ENV" 2>/dev/null | cut -d= -f2- | tr -d '"\r\n ')
  [ -n "$TOKEN" ] && [ -n "$CHAT" ] && \
    curl -s -m 10 "https://api.telegram.org/bot${TOKEN}/sendMessage" \
      -d "chat_id=${CHAT}" -d "text=$1" > /dev/null
}

# Enkripsi berkas di tempat -> <berkas>.enc (AES-256, PBKDF2). Echo path akhir.
# Bila BACKUP_PASSPHRASE kosong, berkas dibiarkan plaintext (kompatibel mundur).
encrypt_file() {
  local in="$1" out="$1.enc"
  [ -n "${BACKUP_PASSPHRASE:-}" ] || { echo "$in"; return 0; }
  if openssl enc -aes-256-cbc -md sha512 -pbkdf2 -iter 200000 -salt \
      -pass env:BACKUP_PASSPHRASE -in "$in" -out "$out" 2>> "$LOG"; then
    rm -f "$in"; echo "$out"
  else
    log "GAGAL: enkripsi $(basename "$in") — disimpan plaintext"; echo "$in"
  fi
}

command -v docker >/dev/null 2>&1 || { log "GAGAL: docker tidak ditemukan"; exit 1; }
[ -f "$APP_ENV" ] || { log "GAGAL: $APP_ENV tidak ada"; exit 1; }

MINIO_USER=$(grep '^MINIO_ROOT_USER=' "$APP_ENV" | cut -d= -f2- | tr -d '"\r\n ')
MINIO_PASS=$(grep '^MINIO_ROOT_PASSWORD=' "$APP_ENV" | cut -d= -f2- | tr -d '"\r\n ')
MINIO_BUCKET=$(grep '^MINIO_BUCKET=' "$APP_ENV" | cut -d= -f2- | tr -d '"\r\n ')
MINIO_USER=${MINIO_USER:-unical}
MINIO_BUCKET=${MINIO_BUCKET:-unical-assets}
# Passphrase enkripsi backup (opsional). Diteruskan ke openssl lewat env, bukan argv.
BACKUP_PASSPHRASE=$(grep '^BACKUP_PASSPHRASE=' "$APP_ENV" | cut -d= -f2- | tr -d '"\r\n')
export BACKUP_PASSPHRASE

mkdir -p "$DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
DB_FILE="$DIR/unical-db-$STAMP.dump"
OBJ_FILE="$DIR/unical-minio-$STAMP.tar.gz"
FAIL=0

# 1) PostgreSQL: format custom agar bisa pg_restore selektif.
if docker exec unical-postgres pg_dump -U unical -d unical \
    --format=custom --no-owner --no-privileges > "$DB_FILE" 2>> "$LOG"; then
  DB_FILE=$(encrypt_file "$DB_FILE")
  log "OK: db $(du -h "$DB_FILE" | cut -f1) -> $(basename "$DB_FILE")"
else
  log "GAGAL: pg_dump"
  tg_notify "⚠️ Backup UNICAL GAGAL: pg_dump error. Cek ~/.unical-backup.log"
  rm -f "$DB_FILE"
  FAIL=1
fi

# 2) MinIO: mirror bucket ke staging lalu di-tar (isi: PDF open-access).
STAGE=$(mktemp -d)
if docker run --rm --network unical-net -v "$STAGE":/stage \
    --entrypoint sh minio/mc:latest -c \
    "mc alias set local http://minio:9000 '$MINIO_USER' '$MINIO_PASS' >/dev/null && \
     mc mirror --overwrite --quiet local/$MINIO_BUCKET /stage" 2>> "$LOG"; then
  tar -czf "$OBJ_FILE" -C "$STAGE" . 2>> "$LOG"
  OBJ_FILE=$(encrypt_file "$OBJ_FILE")
  log "OK: minio $(du -h "$OBJ_FILE" | cut -f1) -> $(basename "$OBJ_FILE")"
else
  log "GAGAL: mirror MinIO"
  tg_notify "⚠️ Backup UNICAL: dump DB tersimpan, tapi mirror MinIO GAGAL."
  FAIL=1
fi
# Mirror mc menulis sebagai root; bila rm host gagal, bersihkan lewat kontainer.
rm -rf "$STAGE" 2>/dev/null || docker run --rm -v "$(dirname "$STAGE")":/parent \
  alpine rm -rf "/parent/$(basename "$STAGE")" 2>/dev/null || true

# 3) Retensi: simpan KEEP salinan terbaru per jenis.
ls -1t "$DIR"/unical-db-*.dump* 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$DIR"/unical-minio-*.tar.gz* 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

# 4) Salinan luar server (bila remote gdrive: terpasang).
if [ -x "$HOME/bin/rclone" ] && "$HOME/bin/rclone" listremotes 2>/dev/null | grep -q '^gdrive:'; then
  for FILE in "$DB_FILE" "$OBJ_FILE"; do
    [ -f "$FILE" ] || continue
    if "$HOME/bin/rclone" copy "$FILE" "gdrive:UNICAL-Backups/" --quiet 2>> "$LOG"; then
      log "OK: ter-upload gdrive:UNICAL-Backups/$(basename "$FILE")"
    else
      log "GAGAL: upload $(basename "$FILE") ke Google Drive"
    fi
  done
  "$HOME/bin/rclone" delete "gdrive:UNICAL-Backups/" --min-age "${KEEP}d" --quiet 2>> "$LOG"
fi

if [ "$FAIL" -eq 0 ]; then
  COUNT=$(ls -1 "$DIR"/unical-db-*.dump* 2>/dev/null | wc -l)
  log "SELESAI: backup lengkap (total $COUNT salinan db)"
fi
exit "$FAIL"
