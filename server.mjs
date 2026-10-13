import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const databasePath = path.resolve(process.env.BENDAHARA_DB_PATH || path.join(root, 'data', 'bendahara.sqlite'));
await mkdir(path.dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS transaksi (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    date TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS transaksi_user_date_idx ON transaksi(user_id, date);
`);

if (!db.prepare('SELECT id FROM user WHERE username = ?').get('admin')) {
  db.prepare('INSERT INTO user (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), 'admin', bcrypt.hashSync('admin', 12), Date.now());
}

const sessionKey = randomBytes(32);
const cookieName = 'bendahara_session';
const sessionSeconds = 60 * 60 * 24 * 7;
const categories = {
  income: ['Iuran', 'Donasi', 'Penjualan', 'Bantuan', 'Lainnya'],
  expense: ['Operasional', 'Perlengkapan', 'Konsumsi', 'Transportasi', 'Kegiatan', 'Lainnya'],
};

function reply(response, status, data, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  response.end(JSON.stringify(data));
}

function makeSession(userId) {
  const payload = Buffer.from(JSON.stringify({ id: userId, exp: Math.floor(Date.now() / 1000) + sessionSeconds })).toString('base64url');
  const signature = createHmac('sha256', sessionKey).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function getUser(request) {
  const cookie = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  if (!token) return null;
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const expected = createHmac('sha256', sessionKey).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof session.id !== 'string' || !Number.isSafeInteger(session.exp) || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return db.prepare('SELECT id, username FROM user WHERE id = ?').get(session.id) || null;
  } catch { return null; }
}

function cookieHeader(value, request, maxAge = sessionSeconds) {
  const secure = request.socket.encrypted ? '; Secure' : '';
  return `${cookieName}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

async function jsonBody(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 32_768) throw new Error('Data terlalu besar.');
  }
  try { return JSON.parse(text); } catch { throw new Error('JSON tidak valid.'); }
}

function parseTransaction(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.type !== 'income' && value.type !== 'expense') return null;
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
  const date = new Date(`${value.date}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.date) return null;
  if (!Number.isSafeInteger(value.amount) || value.amount <= 0) return null;
  if (typeof value.category !== 'string' || !categories[value.type].includes(value.category)) return null;
  if (typeof value.description !== 'string' || !value.description.trim() || value.description.trim().length > 100) return null;
  if (typeof value.note !== 'string' || value.note.length > 300) return null;
  return { type: value.type, date: value.date, amount: value.amount, category: value.category, description: value.description.trim(), note: value.note.trim() };
}

function sameOrigin(request) {
  if (!request.headers.origin) return true;
  const host = request.headers.host;
  return request.headers.origin === `http://${host}` || request.headers.origin === `https://${host}`;
}

async function handleApi(request, response, pathname) {
  if (request.method !== 'GET' && !sameOrigin(request)) return reply(response, 403, { error: 'Asal permintaan tidak valid.' });
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    let body; try { body = await jsonBody(request); } catch { return reply(response, 400, { error: 'Data login tidak valid.' }); }
    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string' || body.username.length > 50 || body.password.length > 200) return reply(response, 400, { error: 'Data login tidak valid.' });
    const user = db.prepare('SELECT id, username, password_hash AS passwordHash FROM user WHERE username = ?').get(body.username.trim());
    if (!user || !bcrypt.compareSync(body.password, user.passwordHash)) return reply(response, 401, { error: 'Username atau password salah.' });
    return reply(response, 200, { user: { id: user.id, username: user.username } }, { 'Set-Cookie': cookieHeader(makeSession(user.id), request) });
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') return reply(response, 200, { ok: true }, { 'Set-Cookie': cookieHeader('', request, 0) });
  const user = getUser(request);
  if (!user) return reply(response, 401, { error: 'Silakan masuk terlebih dahulu.' });
  if (pathname === '/api/auth/me' && request.method === 'GET') return reply(response, 200, { user });
  if (pathname === '/api/transactions' && request.method === 'GET') {
    const transactions = db.prepare('SELECT id, type, date, amount, category, description, note, created_at AS createdAt FROM transaksi WHERE user_id = ? ORDER BY date DESC, created_at DESC').all(user.id);
    return reply(response, 200, { transactions });
  }
  if (pathname === '/api/transactions' && request.method === 'POST') {
    let body; try { body = await jsonBody(request); } catch { return reply(response, 400, { error: 'Data transaksi tidak valid.' }); }
    const item = parseTransaction(body);
    if (!item) return reply(response, 400, { error: 'Isi transaksi tidak valid.' });
    const id = randomUUID(), createdAt = Date.now();
    db.prepare('INSERT INTO transaksi (id, user_id, type, date, amount, category, description, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, item.type, item.date, item.amount, item.category, item.description, item.note, createdAt);
    return reply(response, 201, { transaction: { id, ...item, createdAt } });
  }
  const match = /^\/api\/transactions\/([0-9a-f-]{36})$/.exec(pathname);
  if (match && request.method === 'PATCH') {
    let body; try { body = await jsonBody(request); } catch { return reply(response, 400, { error: 'Data transaksi tidak valid.' }); }
    const item = parseTransaction(body);
    if (!item) return reply(response, 400, { error: 'Isi transaksi tidak valid.' });
    const result = db.prepare('UPDATE transaksi SET type = ?, date = ?, amount = ?, category = ?, description = ?, note = ? WHERE id = ? AND user_id = ?')
      .run(item.type, item.date, item.amount, item.category, item.description, item.note, match[1], user.id);
    return result.changes ? reply(response, 200, { transaction: { id: match[1], ...item } }) : reply(response, 404, { error: 'Transaksi tidak ditemukan.' });
  }
  if (match && request.method === 'DELETE') {
    const result = db.prepare('DELETE FROM transaksi WHERE id = ? AND user_id = ?').run(match[1], user.id);
    return result.changes ? reply(response, 200, { ok: true }) : reply(response, 404, { error: 'Transaksi tidak ditemukan.' });
  }
  return reply(response, 404, { error: 'Endpoint tidak ditemukan.' });
}

const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
    if (pathname.startsWith('/api/')) return await handleApi(request, response, pathname);
    const resource = staticFiles.get(pathname);
    if (!resource || request.method !== 'GET') return reply(response, 404, { error: 'Halaman tidak ditemukan.' });
    const [file, type] = resource;
    const content = await readFile(path.join(publicDir, file));
    response.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
    response.end(content);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) reply(response, 500, { error: 'Terjadi kesalahan server.' }); else response.end();
  }
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => console.log(`Bendahara berjalan di http://${host}:${port} — SQLite: ${databasePath}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); db.close(); process.exit(0); });
