# Bendahara

Aplikasi web responsif untuk mencatat pemasukan dan pengeluaran. Pengguna dan transaksi disimpan pada SQLite melalui Cloudflare D1. Login awal menggunakan username `admin` dan password `admin`; database menyimpan hash bcrypt, bukan password asli.

## Menjalankan secara lokal

Prasyarat: Node.js 22.13 atau lebih baru.

1. Jalankan `npm install`.
2. Buat `.dev.vars` berdasarkan `.dev.vars.example`, lalu isi `SESSION_SECRET` dengan string acak minimal 32 karakter. File ini tidak masuk Git.
3. Jalankan `npm run db:generate` jika skema berubah, kemudian `npm run build`.
4. Untuk database lokal yang baru, jalankan sekali:

   ```powershell
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_shallow_starbolt.sql
   ```

5. Jalankan `npm start`, lalu buka alamat localhost yang ditampilkan. Akun awal: `admin` / `admin`.

Database lokal berada di `.wrangler/state`. Database hosting terpisah. Migrasi hosting dijalankan saat publikasi Site.

## Struktur data

- `users`: ID, username unik, hash bcrypt, waktu pembuatan.
- `transactions`: ID, pemilik, jenis, tanggal, nominal rupiah, kategori, keterangan, catatan, waktu pembuatan.

Semua endpoint transaksi memerlukan cookie sesi yang ditandatangani. Cookie bersifat HttpOnly dan SameSite=Lax. Password awal `admin` hanya untuk bootstrap; ubah sebelum aplikasi dipakai untuk data sebenarnya. Data lama di localStorage tidak dipindahkan otomatis.

Lihat [PRD.md](PRD.md) dan [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) untuk cakupan dan rencana implementasi.
