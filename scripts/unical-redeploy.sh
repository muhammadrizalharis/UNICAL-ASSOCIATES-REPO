#!/usr/bin/env bash
# Redeploy UNICAL ASSOCIATES di server self-hosted.
# Jalankan DI SERVER tempat docker-compose berjalan, bukan di mesin dev.
#
#   ./scripts/unical-redeploy.sh
#
# Script akan: ambil kode terbaru dari main, rebuild image Docker (menarik
# base image Node terbaru untuk patch keamanan), lalu restart service.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Pull kode terbaru (main)"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "==> Rebuild & restart container (tanpa cache base image lama)"
docker compose pull || true
docker compose build --pull
docker compose up -d

echo "==> Status"
docker compose ps

echo "==> Selesai. Verifikasi runtime di dalam container bila perlu:"
echo "    docker compose exec frontend node --version"
echo "    docker compose exec backend node --version"
