#!/usr/bin/env bash
# Redeploy UNICAL ASSOCIATES (sepenuhnya Docker).
# Jalankan di host tempat container berjalan.
#
#   cd "$HOME/UNICAL ASSOCIATES" && ./scripts/unical-redeploy.sh
#
# CATATAN: path repo mengandung spasi. Jika memanggil dengan path lengkap,
# WAJIB dikutip, mis.:
#   "$HOME/UNICAL ASSOCIATES/scripts/unical-redeploy.sh"
#
# Hanya service aplikasi (api, web, worker) yang di-rebuild. Infra
# (postgres/redis/meili/minio/nginx) dibiarkan berjalan agar tidak kena
# rate-limit pull Docker Hub.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Pull kode terbaru (main)"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "==> Rebuild image aplikasi (base Node terbaru via --pull)"
docker compose build --pull api web

echo "==> Recreate container aplikasi saja"
docker compose up -d api web worker nginx

echo "==> Status"
docker compose ps api web worker nginx

echo "==> Verifikasi versi di dalam container:"
echo "    docker exec unical-web node -e \"console.log(require('next/package.json').version, process.version)\""
echo "    docker exec unical-api node --version"
