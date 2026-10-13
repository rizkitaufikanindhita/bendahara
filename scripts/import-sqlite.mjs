import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourcePath = process.env.BENDAHARA_DB_PATH || path.join(root, 'data', 'bendahara.sqlite');
if (!existsSync(sourcePath)) throw new Error(`Berkas SQLite tidak ditemukan: ${sourcePath}`);
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED belum diatur. Jalankan neon deploy.');

const source = new DatabaseSync(sourcePath, { readOnly: true });
const target = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await target.connect();
try {
  const users = source.prepare('SELECT id, username, password_hash, created_at FROM user').all();
  const transactions = source.prepare('SELECT id, user_id, type, date, amount, category, description, note, created_at FROM transaksi').all();
  await target.query('BEGIN');
  const userIds = new Map();
  for (const user of users) {
    const result = await target.query(`INSERT INTO app_user (id, username, password_hash, created_at)
      VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username RETURNING id`,
      [user.id, user.username, user.password_hash, user.created_at]);
    userIds.set(user.id, result.rows[0].id);
  }
  let imported = 0;
  for (const item of transactions) {
    const result = await target.query(`INSERT INTO transaksi
      (id, user_id, type, date, amount, category, description, note, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
      [item.id, userIds.get(item.user_id), item.type, item.date, item.amount, item.category, item.description, item.note, item.created_at]);
    imported += result.rowCount;
  }
  await target.query('COMMIT');
  console.log(`Impor SQLite selesai: ${users.length} pengguna diperiksa, ${imported} transaksi baru.`);
} catch (error) {
  await target.query('ROLLBACK');
  throw error;
} finally {
  await target.end();
  source.close();
}
