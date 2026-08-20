#!/usr/bin/env bash
# Watchdog UNICAL: pastikan seluruh stack hidup dan API menjawab.
# Dipanggil cron tiap 5 menit dan saat reboot. Menyembuhkan sendiri
# (docker compose up -d) lalu memberi tahu bila tetap gagal.
set -u

PROJECT_DIR="$HOME/UNICAL ASSOCIATES"
LOG="$HOME/.unical-monitor.log"
APP_ENV="$PROJECT_DIR/.env"
HEALTH_URL="http://127.0.0.1:48080/api/v1/health"
STATE="$HOME/.unical-monitor.state"

log() { echo "$(date -Is) $*" >> "$LOG"; }

tg_notify() {
  local TOKEN CHAT
  TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$APP_ENV" 2>/dev/null | cut -d= -f2- | tr -d '"\r\n ')
  CHAT=$(grep '^TELEGRAM_CHAT_ID=' "$APP_ENV" 2>/dev/null | cut -d= -f2- | tr -d '"\r\n ')
  [ -n "$TOKEN" ] && [ -n "$CHAT" ] && \
    curl -s -m 10 "https://api.telegram.org/bot${TOKEN}/sendMessage" \
      -d "chat_id=${CHAT}" -d "text=$1" > /dev/null
}

cd "$PROJECT_DIR" || { log "GAGAL: folder proyek tidak ada"; exit 1; }

# 1) Container yang mati/di-restart terus dihidupkan kembali.
DOWN=$(docker compose ps --format '{{.Name}} {{.State}}' 2>> "$LOG" \
  | awk '$2 != "running" {print $1}')
if [ -n "$DOWN" ]; then
  log "PULIH: menghidupkan kembali -> $(echo "$DOWN" | tr '\n' ' ')"
  docker compose up -d >> "$LOG" 2>&1
  sleep 20
fi

# 2) Uji jalur penuh nginx -> api -> db.
if curl -fsS -m 10 "$HEALTH_URL" > /dev/null 2>&1; then
  # Pulih setelah sebelumnya gagal? Kabari sekali.
  if [ -f "$STATE" ]; then
    rm -f "$STATE"
    log "PULIH: API sehat kembali"
    tg_notify "✅ UNICAL pulih: API sehat kembali."
  fi
  exit 0
fi

# Gagal: coba sembuhkan sekali lagi sebelum lapor.
log "GAGAL: $HEALTH_URL tidak menjawab; mencoba restart"
docker compose up -d >> "$LOG" 2>&1
docker compose restart nginx >> "$LOG" 2>&1
sleep 25

if curl -fsS -m 10 "$HEALTH_URL" > /dev/null 2>&1; then
  log "PULIH: sehat setelah restart"
  exit 0
fi

# Masih gagal: lapor sekali per insiden (tidak spam tiap 5 menit).
log "DARURAT: API tetap tidak menjawab setelah restart"
if [ ! -f "$STATE" ]; then
  date -Is > "$STATE"
  tg_notify "🔴 UNICAL DOWN: API tidak menjawab meski sudah di-restart otomatis. Cek server."
fi
exit 1
