#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Reset kata sandi akun SUPER ADMIN UNICAL ASSOCIATES REPO.
# Dijalankan langsung oleh pemilik server. Kata sandi baru diminta lewat
# prompt tersembunyi (tidak ditampilkan, tidak masuk history, tidak dikirim
# ke mana pun). Hash Argon2id dibuat di dalam container `unical-api` memakai
# parameter yang sama seperti backend, lalu sesi lama dicabut.
#
# Pakai bila lupa/berganti sandi super admin (mis. setelah diubah dari
# dashboard) sehingga tidak bisa masuk di /welcome/assoc=-000.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Reset kata sandi super admin =="

EMAIL=$(sg docker -c "docker exec unical-postgres psql -U unical -d unical -tAc \
  \"SELECT email FROM users WHERE role='SUPER_ADMIN' ORDER BY created_at LIMIT 1;\"" \
  | tr -d '[:space:]')
if [[ -z "$EMAIL" ]]; then
  echo "Akun super admin tidak ditemukan di basis data." >&2
  exit 1
fi
echo "Akun target : $EMAIL"
echo

read -rsp "Kata sandi baru (min. 12 karakter): " PW1; echo
read -rsp "Ulangi kata sandi baru            : " PW2; echo
if [[ "$PW1" != "$PW2" ]]; then
  echo "Kata sandi tidak cocok. Dibatalkan." >&2
  exit 1
fi
if [[ ${#PW1} -lt 12 ]]; then
  echo "Kata sandi minimal 12 karakter. Dibatalkan." >&2
  exit 1
fi

# Hash di dalam container (parameter sama seperti backend: 64 MB, t=3, p=4).
# Kata sandi dialirkan lewat stdin, bukan argumen, agar tidak terbaca proses lain.
HASH=$(printf '%s' "$PW1" | sg docker -c "docker exec -i unical-api node -e '
const { hash } = require(\"@node-rs/argon2\");
let d = \"\";
process.stdin.on(\"data\", (c) => (d += c)).on(\"end\", async () => {
  process.stdout.write(
    await hash(d, { memoryCost: 65536, timeCost: 3, parallelism: 4 }),
  );
});
'")
unset PW1 PW2

if [[ "$HASH" != \$argon2id\$* ]]; then
  echo "Gagal membuat hash Argon2id. Dibatalkan." >&2
  exit 1
fi

# Simpan hash & cabut semua sesi lama akun ini (token lama jadi tidak berlaku).
sg docker -c "docker exec unical-postgres psql -U unical -d unical -v ON_ERROR_STOP=1 -c \
  \"UPDATE users SET password_hash='$HASH' WHERE email='$EMAIL'; \
    DELETE FROM user_sessions WHERE user_id = (SELECT id FROM users WHERE email='$EMAIL');\""

echo
echo "Selesai. Sesi lama dicabut."
echo "Silakan masuk di  http://10.33.33.11:48080/welcome/assoc=-000  dengan kata sandi baru."
