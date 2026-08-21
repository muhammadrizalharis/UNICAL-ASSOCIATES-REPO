#!/usr/bin/env node
/**
 * Bot ops UNICAL ASSOCIATES REPO — long polling (getUpdates), tanpa webhook.
 * KEAMANAN: hanya melayani TELEGRAM_CHAT_ID dari .env; chat lain diabaikan.
 *
 * Info    : /status /statistik /disk /pengguna /antrean /publikasi /aktivitas
 * Aksi    : /backup /backupinfo /restart <svc> /log <svc> /sitasi /reindex /metrik
 * Bantuan : /bantuan
 *
 * Jalankan: nohup node scripts/unical-ops-bot.mjs >> ~/.unical-ops-bot.log 2>&1 &
 * (cron @reboot + watchdog pgrep sudah dipasang otomatis.)
 */
import { execFile } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();
const PROJECT = join(HOME, 'UNICAL ASSOCIATES');
const BASE = 'http://127.0.0.1:48080';
const API = `${BASE}/api/v1`;

function readEnv() {
  const raw = readFileSync(join(PROJECT, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^"/, '').replace(/"\s*$/, '').trim();
  }
  return env;
}

const env = readEnv();
const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = String(env.TELEGRAM_CHAT_ID ?? '');
const BOT_SECRET = env.UNICAL_BOT_SECRET ?? '';
const TG = `https://api.telegram.org/bot${TOKEN}`;

if (!TOKEN || !CHAT_ID) {
  console.error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi di .env');
  process.exit(1);
}
if (!BOT_SECRET) {
  console.error('UNICAL_BOT_SECRET belum diisi di .env — perintah aksi butuh ini');
  process.exit(1);
}

/** Bandingkan secret tanpa membocorkan panjang/isi lewat timing. */
function secretValid(candidate) {
  const a = createHash('sha256').update(String(candidate ?? '')).digest();
  const b = createHash('sha256').update(BOT_SECRET).digest();
  return timingSafeEqual(a, b);
}

// ── Util eksekusi aman (execFile, tanpa shell) ──
function run(cmd, args, timeout = 120_000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = (stdout || '') + (stderr ? `\n${stderr}` : '');
      resolve(out.trim() || (err ? String(err) : '(tanpa output)'));
    });
  });
}

const compose = (args, t) =>
  run('docker', ['compose', '--project-directory', PROJECT, ...args], t);

/** Query read-only ke Postgres di dalam container. */
const psql = (sql) =>
  run('docker', ['exec', 'unical-postgres', 'psql', '-U', 'unical', '-d', 'unical', '-P', 'border=0', '-c', sql]);

// ── Token super admin: diterbitkan sendiri (JWT HS256 + sesi di DB),
//    tidak bergantung sandi yang bisa diganti pemiliknya kapan saja. ──
let adminToken = null;

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function adminLogin() {
  const { createHmac } = await import('node:crypto');
  const userId = (
    await run('docker', [
      'exec', 'unical-postgres', 'psql', '-U', 'unical', '-d', 'unical', '-tAc',
      "SELECT id FROM users WHERE role='SUPER_ADMIN' ORDER BY created_at LIMIT 1;",
    ])
  ).trim();
  if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error('super admin tidak ditemukan');

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: userId, iat: now, exp: now + 30 * 86400 }));
  const sig = b64url(
    createHmac('sha256', env.JWT_SECRET).update(`${header}.${payload}`).digest(),
  );
  const token = `${header}.${payload}.${sig}`;

  const tokenHash = createHash('sha256').update(token).digest('hex');
  await run('docker', [
    'exec', 'unical-postgres', 'psql', '-U', 'unical', '-d', 'unical', '-c',
    `INSERT INTO user_sessions (id, user_id, token_hash, user_agent, expires_at)
     VALUES (gen_random_uuid(), '${userId}', '${tokenHash}', 'unical-ops-bot', now() + interval '30 days')
     ON CONFLICT (token_hash) DO NOTHING;`,
  ]);
  adminToken = token;
}

async function adminPost(path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!adminToken) await adminLogin();
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status === 401) {
      adminToken = null;
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`);
    return body.data;
  }
  throw new Error('gagal autentikasi ulang');
}

// ── Kirim pesan (dipotong sesuai batas 4096 Telegram) ──
async function send(text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 3800) chunks.push(text.slice(i, i + 3800));
  for (const chunk of chunks.length ? chunks : ['(kosong)']) {
    await fetch(`${TG}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: chunk }),
    }).catch(() => {});
  }
}

// ── Perintah ──
const SERVICES = ['api', 'web', 'worker', 'nginx', 'postgres', 'redis', 'meili', 'minio'];

const HELP = `🤖 Bot Ops UNICAL ASSOCIATES REPO

📊 INFO (tanpa secret)
/status — kesehatan container + situs
/statistik — angka repositori (publikasi, sitasi, dst)
/pengguna — daftar akun & login terakhir
/antrean — moderasi menunggu (publikasi/klaim/verifikasi/laporan)
/publikasi — 5 publikasi terbaru
/aktivitas — 10 aksi audit terakhir
/disk — pemakaian disk & ukuran backup
/backupinfo — riwayat & berkas backup
/log — log ringkas SEMUA layanan (atau /log api)

⚙️ AKSI (wajib secret di akhir perintah)
/backup {SECRET}
/restart {SECRET} — restart SEMUA layanan
/restart api {SECRET} — (opsional) satu layanan saja
/sitasi {SECRET} — perbarui sitasi semua publikasi
/reindex {SECRET} — bangun ulang indeks pencarian
/metrik {SECRET} — hitung ulang metrik peneliti

🔐 {SECRET} = nilai UNICAL_BOT_SECRET di .env server.
Pesan yang memuat secret otomatis DIHAPUS dari chat setelah diproses.`;

async function cmdStatus() {
  const ps = await compose(['ps', '--format', '{{.Name}}\t{{.Status}}']);
  let site = '❌ tidak menjawab';
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) site = '✅ sehat';
  } catch {}
  const up = await run('uptime', ['-p']);
  return `🖥 Situs: ${site}\n⏱ Server: ${up}\n\n${ps}`;
}

async function cmdStatistik() {
  const r = await fetch(`${API}/stats`);
  const d = (await r.json()).data;
  const fak = d.byFaculty
    .map((f) => `  • ${f.faculty}: ${f.publications} publikasi, ${f.citations} sitasi`)
    .join('\n');
  return (
    `📊 Statistik UNICAL\n` +
    `Publikasi: ${d.totals.publications}\nSitasi: ${d.totals.citations}\n` +
    `Peneliti: ${d.totals.researchers}\nJurnal: ${d.totals.journals}\n\nPer fakultas:\n${fak}`
  );
}

const cmdPengguna = () =>
  psql(`SELECT u.email, u.role, COALESCE(rp.unical_id,'-') AS unical_id,
    to_char(u.last_login_at AT TIME ZONE 'Asia/Makassar','DD Mon HH24:MI') AS login_terakhir
    FROM users u LEFT JOIN researcher_profiles rp ON rp.user_id=u.id
    ORDER BY u.last_login_at DESC NULLS LAST;`);

const cmdAntrean = () =>
  psql(`SELECT 'publikasi PENDING' AS antrean, count(*) FROM publications WHERE status='PENDING'
    UNION ALL SELECT 'klaim PENDING', count(*) FROM claim_requests WHERE status='PENDING'
    UNION ALL SELECT 'peneliti belum verifikasi', count(*) FROM researcher_profiles WHERE unical_id IS NULL AND affiliation_completed_at IS NOT NULL
    UNION ALL SELECT 'laporan OPEN', count(*) FROM reports WHERE status='OPEN';`);

const cmdPublikasi = () =>
  psql(`SELECT left(title,60) AS judul, citation_count AS sitasi,
    to_char(created_at AT TIME ZONE 'Asia/Makassar','DD Mon') AS masuk
    FROM publications ORDER BY created_at DESC LIMIT 5;`);

const cmdAktivitas = () =>
  psql(`SELECT to_char(a.created_at AT TIME ZONE 'Asia/Makassar','DD Mon HH24:MI') AS waktu,
    a.action, COALESCE(u.email,'-') AS oleh
    FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
    ORDER BY a.created_at DESC LIMIT 10;`);

async function cmdDisk() {
  const df = await run('df', ['-h', '--output=avail,pcent', '/']);
  const du = await run('du', ['-sh', join(HOME, 'unical-backups')]);
  const vol = await run('docker', ['system', 'df', '--format', '{{.Type}}: {{.Size}}']);
  return `💾 Disk root:\n${df}\n\nBackup: ${du}\n\nDocker:\n${vol}`;
}

async function cmdBackup() {
  await send('⏳ Menjalankan backup…');
  const out = await run('bash', [join(PROJECT, 'scripts', 'unical-backup.sh')], 600_000);
  const log = await run('tail', ['-4', join(HOME, '.unical-backup.log')]);
  return `🗄 Backup selesai.\n${log}${out && out !== '(tanpa output)' ? `\n${out}` : ''}`;
}

async function cmdBackupInfo() {
  const log = await run('tail', ['-8', join(HOME, '.unical-backup.log')]);
  const ls = await run('ls', ['-lht', join(HOME, 'unical-backups')]);
  return `📜 Log terakhir:\n${log}\n\n📁 Berkas:\n${ls.split('\n').slice(0, 10).join('\n')}`;
}

async function cmdRestart(arg) {
  // Tanpa argumen = restart seluruh stack.
  if (!arg || arg === 'semua') {
    await send('⏳ Restart seluruh stack…');
    await compose(['restart'], 300_000);
    return cmdStatus();
  }
  if (!SERVICES.includes(arg)) {
    return `Layanan tidak dikenal. Pilihan: ${SERVICES.join(', ')} (kosongkan untuk semua)`;
  }
  await send(`⏳ Restart ${arg}…`);
  await compose(['restart', arg], 180_000);
  if (arg === 'api' || arg === 'web') await compose(['restart', 'nginx'], 60_000);
  return cmdStatus();
}

async function cmdLog(arg) {
  const allowed = ['api', 'web', 'worker', 'nginx'];
  if (arg) {
    if (!allowed.includes(arg)) return `Pilihan: ${allowed.join(', ')} (kosongkan untuk semua)`;
    return run('docker', ['logs', '--tail', '15', `unical-${arg}`]);
  }
  // Tanpa argumen = ringkasan semua layanan.
  const parts = [];
  for (const svc of allowed) {
    const out = await run('docker', ['logs', '--tail', '6', `unical-${svc}`]);
    parts.push(`── ${svc.toUpperCase()} ──\n${out}`);
  }
  return parts.join('\n\n');
}

// ── Loop utama ──
let offset = 0;
console.log(`[${new Date().toISOString()}] bot ops UNICAL mulai`);

// Perintah yang mengubah keadaan sistem: wajib menyertakan secret di akhir.
const NEED_SECRET = new Set(['/backup', '/restart', '/sitasi', '/reindex', '/metrik']);

async function handle(text) {
  const tokens = text.trim().split(/\s+/);
  const cmd = tokens[0];

  let args = tokens.slice(1);
  if (NEED_SECRET.has(cmd)) {
    const candidate = args.at(-1);
    if (!candidate || !secretValid(candidate)) {
      return `🔐 Perintah ini butuh secret di akhir:\n${cmd}${cmd === '/restart' ? ' <layanan>' : ''} {UNICAL_BOT_SECRET}`;
    }
    args = args.slice(0, -1);
  }
  const arg = args[0] ?? '';

  try {
    switch (cmd) {
      case '/start':
      case '/help':
      case '/bantuan':
        return HELP;
      case '/status':
        return await cmdStatus();
      case '/statistik':
      case '/stats':
        return await cmdStatistik();
      case '/pengguna':
      case '/users':
        return '👥 Pengguna:\n' + (await cmdPengguna());
      case '/antrean':
        return '📥 Antrean moderasi:\n' + (await cmdAntrean());
      case '/publikasi':
        return '📄 Publikasi terbaru:\n' + (await cmdPublikasi());
      case '/aktivitas':
        return '🧾 Audit terakhir:\n' + (await cmdAktivitas());
      case '/disk':
        return await cmdDisk();
      case '/backup':
        return await cmdBackup();
      case '/backupinfo':
        return await cmdBackupInfo();
      case '/restart':
        return await cmdRestart(arg);
      case '/log':
        return await cmdLog(arg);
      case '/sitasi': {
        await send('⏳ Memperbarui sitasi via OpenAlex…');
        const d = await adminPost('/admin/citations/refresh');
        return `📈 Sitasi: ${JSON.stringify(d)}`;
      }
      case '/reindex': {
        const d = await adminPost('/admin/search/reindex');
        return `🔍 Reindex: ${JSON.stringify(d)}`;
      }
      case '/metrik': {
        await send('⏳ Menghitung ulang metrik…');
        const d = await adminPost('/admin/metrics/recalculate');
        return `🧮 Metrik: diproses ${d.processed} peneliti`;
      }
      default:
        return `Perintah tidak dikenal: ${cmd}\nKetik /bantuan untuk daftar perintah.`;
    }
  } catch (error) {
    return `⚠️ Gagal: ${String(error.message ?? error).slice(0, 300)}`;
  }
}

async function poll() {
  try {
    const res = await fetch(`${TG}/getUpdates?timeout=50&offset=${offset}`, {
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.json();
    for (const update of body.result ?? []) {
      offset = update.update_id + 1;
      const msg = update.message;
      if (!msg?.text) continue;
      // Tolak semua chat selain pemilik — tanpa balasan, hanya dicatat.
      if (String(msg.chat.id) !== CHAT_ID) {
        console.log(`[tolak] chat asing ${msg.chat.id}: ${msg.text.slice(0, 50)}`);
        continue;
      }
      const reply = await handle(msg.text);
      // Pesan yang memuat secret dihapus agar tidak tersimpan di riwayat chat.
      if (NEED_SECRET.has(msg.text.trim().split(/\s+/)[0])) {
        await fetch(`${TG}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT_ID, message_id: msg.message_id }),
        }).catch(() => {});
      }
      await send(reply);
    }
  } catch (error) {
    console.error(`[poll] ${String(error).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  setImmediate(poll);
}

// Menu perintah di UI Telegram.
fetch(`${TG}/setMyCommands`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    commands: [
      { command: 'status', description: 'Kesehatan container + situs' },
      { command: 'statistik', description: 'Angka repositori' },
      { command: 'pengguna', description: 'Daftar akun & login terakhir' },
      { command: 'antrean', description: 'Moderasi menunggu' },
      { command: 'publikasi', description: '5 publikasi terbaru' },
      { command: 'aktivitas', description: 'Audit log terakhir' },
      { command: 'disk', description: 'Pemakaian disk & backup' },
      { command: 'backup', description: 'Jalankan backup sekarang' },
      { command: 'backupinfo', description: 'Riwayat backup' },
      { command: 'restart', description: 'Restart semua (+secret); opsional nama layanan' },
      { command: 'log', description: 'Log semua layanan; opsional /log api' },
      { command: 'sitasi', description: 'Perbarui sitasi OpenAlex' },
      { command: 'reindex', description: 'Bangun ulang indeks pencarian' },
      { command: 'metrik', description: 'Hitung ulang metrik peneliti' },
      { command: 'bantuan', description: 'Daftar perintah' },
    ],
  }),
}).catch(() => {});

poll();
