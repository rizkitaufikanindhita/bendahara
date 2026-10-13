import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diatur. Jalankan neon deploy terlebih dahulu.');
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const schema = await readFile(path.join(root, 'migrations', '001_initial.sql'), 'utf8');
const migrationDb = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
await migrationDb.connect();
try { await migrationDb.query(schema); } finally { await migrationDb.end(); }
const existingAdmin = (await db.query('SELECT id FROM app_user WHERE username = $1', ['admin'])).rows[0];
if (!existingAdmin) {
  const initialPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? null : 'admin');
  if (!initialPassword) throw new Error('ADMIN_PASSWORD wajib diatur untuk membuat akun awal pada production.');
  await db.query('INSERT INTO app_user (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING',
    [randomUUID(), 'admin', bcrypt.hashSync(initialPassword, 12), Date.now()]);
}

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET wajib diatur pada lingkungan production.');
const sessionKey = process.env.SESSION_SECRET || randomBytes(32);
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

async function getUser(request) {
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
    const result = await db.query('SELECT id, username FROM app_user WHERE id = $1', [session.id]);
    return result.rows[0] || null;
  } catch { return null; }
}

function cookieHeader(value, request, maxAge = sessionSeconds) {
  const secure = request.socket.encrypted || request.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
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
    const user = (await db.query('SELECT id, username, password_hash AS "passwordHash" FROM app_user WHERE username = $1', [body.username.trim()])).rows[0];
    if (!user || !bcrypt.compareSync(body.password, user.passwordHash)) return reply(response, 401, { error: 'Username atau password salah.' });
    return reply(response, 200, { user: { id: user.id, username: user.username } }, { 'Set-Cookie': cookieHeader(makeSession(user.id), request) });
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') return reply(response, 200, { ok: true }, { 'Set-Cookie': cookieHeader('', request, 0) });
  const user = await getUser(request);
  if (!user) return reply(response, 401, { error: 'Silakan masuk terlebih dahulu.' });
  if (pathname === '/api/auth/me' && request.method === 'GET') return reply(response, 200, { user });
  if (pathname === '/api/transactions' && request.method === 'GET') {
    const transactions = (await db.query(`SELECT id, type, to_char(date, 'YYYY-MM-DD') AS date, amount::float8 AS amount,
      category, description, note, created_at::float8 AS "createdAt"
      FROM transaksi WHERE user_id = $1 ORDER BY date DESC, created_at DESC`, [user.id])).rows;
    return reply(response, 200, { transactions });
  }
  if (pathname === '/api/transactions' && request.method === 'POST') {
    let body; try { body = await jsonBody(request); } catch { return reply(response, 400, { error: 'Data transaksi tidak valid.' }); }
    const item = parseTransaction(body);
    if (!item) return reply(response, 400, { error: 'Isi transaksi tidak valid.' });
    const id = randomUUID(), createdAt = Date.now();
    await db.query('INSERT INTO transaksi (id, user_id, type, date, amount, category, description, note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, user.id, item.type, item.date, item.amount, item.category, item.description, item.note, createdAt]);
    return reply(response, 201, { transaction: { id, ...item, createdAt } });
  }
  const match = /^\/api\/transactions\/([0-9a-f-]{36})$/.exec(pathname);
  if (match && request.method === 'PATCH') {
    let body; try { body = await jsonBody(request); } catch { return reply(response, 400, { error: 'Data transaksi tidak valid.' }); }
    const item = parseTransaction(body);
    if (!item) return reply(response, 400, { error: 'Isi transaksi tidak valid.' });
    const result = await db.query('UPDATE transaksi SET type = $1, date = $2, amount = $3, category = $4, description = $5, note = $6 WHERE id = $7 AND user_id = $8',
      [item.type, item.date, item.amount, item.category, item.description, item.note, match[1], user.id]);
    return result.rowCount ? reply(response, 200, { transaction: { id: match[1], ...item } }) : reply(response, 404, { error: 'Transaksi tidak ditemukan.' });
  }
  if (match && request.method === 'DELETE') {
    const result = await db.query('DELETE FROM transaksi WHERE id = $1 AND user_id = $2', [match[1], user.id]);
    return result.rowCount ? reply(response, 200, { ok: true }) : reply(response, 404, { error: 'Transaksi tidak ditemukan.' });
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
server.listen(port, host, () => console.log(`Bendahara berjalan di http://${host}:${port} — Neon Postgres`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(); void db.end(); });
