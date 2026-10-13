# Bendahara

Aplikasi pencatatan keuangan dengan server Node.js dan database Postgres di Neon. Login dan API tetap dijalankan oleh aplikasi; Neon menyimpan pengguna serta transaksi.

## Menjalankan

Perlu Node.js 22.13 atau lebih baru. Proyek sudah terhubung ke proyek Neon `red-sunset-82753362`, cabang `production`.

```powershell
npm install
neon deploy
npm run build
npm start
```

`neon deploy` menarik `DATABASE_URL` (koneksi pooled) dan `DATABASE_URL_UNPOOLED` (koneksi langsung) ke `.env.local`. Berkas ini diabaikan Git. Buka `http://localhost:3000` setelah server berjalan. Skema tabel dibuat dari `migrations/001_initial.sql` saat server dimulai.

Akun awal bernama `admin`. Kata sandi awal diambil dari `ADMIN_PASSWORD` pada `.env.local`. Untuk instalasi lokal yang belum memiliki nilai itu, aplikasi memakai `admin`; pada `NODE_ENV=production`, kata sandi harus diberikan sebelum akun pertama dibuat. `SESSION_SECRET` harus diatur pada production agar sesi login tetap berlaku antarinstance. Jangan masukkan kedua nilai rahasia itu ke Git.

## Impor dari SQLite lama

Jika ada berkas `data/bendahara.sqlite`, jalankan setelah aplikasi pertama kali membuat skema:

```powershell
npm run import:sqlite
```

Perintah ini menyalin transaksi yang belum ada berdasarkan ID. Jika akun dengan nama yang sama sudah ada di Neon, kata sandinya tetap seperti semula dan transaksi lama dipetakan ke akun tersebut. Berkas SQLite asli tetap utuh sebagai cadangan.

## Deploy aplikasi

`neon deploy` menyiapkan layanan Postgres dan variabel lingkungan lokal; perintah itu tidak mempublikasikan aplikasi web. Pada host aplikasi, atur `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET`, dan `ADMIN_PASSWORD` sebagai variabel lingkungan. Jalankan `npm run build` sebelum memublikasikan kode.

File `.codex/config.toml` menghubungkan Neon MCP ke proyek ini. Skill Neon terpasang di tingkat pengguna; konfigurasi global lain tidak diubah oleh aplikasi.
