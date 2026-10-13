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

## Deploy ke Vercel

`neon deploy` menyiapkan Postgres, sedangkan Vercel memublikasikan web. Berkas `server.ts` adalah titik masuk Vercel; aset dalam `public/` disajikan sebagai berkas statis. Skema database pada cabang Neon `production` sudah dibuat saat aplikasi dijalankan secara lokal.

1. Unggah repositori ini ke GitHub, lalu buat proyek baru di Vercel melalui **Add New → Project** dan pilih repositori tersebut. Gunakan direktori akar dan preset **Other**.
2. Di **Settings → Environment Variables**, isi `DATABASE_URL` dan `SESSION_SECRET` untuk lingkungan **Production**. Salin nilainya dari `.env.local` lokal; jangan mengunggah berkas itu. `DATABASE_URL` adalah alamat pooled Neon. Akun admin yang sudah ada di Neon tetap memakai kata sandi yang dibuat saat pengaturan lokal (`ADMIN_PASSWORD` lokal); mengganti variabel itu di Vercel tidak mengubah kata sandi akun yang sudah ada.
3. Deploy proyek. Jika memakai CLI setelah proyek ditautkan: `vercel deploy --prod`.
4. Buka URL hasil deploy, masuk sebagai admin, lalu pastikan transaksi hasil impor muncul. Lihat log Vercel jika muncul error server.

Saat membuat cabang database Neon baru yang masih kosong, jalankan aplikasi secara lokal dengan variabel Neon cabang itu terlebih dahulu agar skema dibuat. Untuk membuat akun admin baru pada lingkungan production, berikan `ADMIN_PASSWORD` juga. Pada Vercel, migrasi skema tidak dijalankan setiap kali Function dimulai.

File `.codex/config.toml` menghubungkan Neon MCP ke proyek ini. Skill Neon terpasang di tingkat pengguna; konfigurasi global lain tidak diubah oleh aplikasi.
