# Rencana implementasi — login dan SQLite berkas

## Tujuan
Menjalankan aplikasi web Bendahara dengan database SQLite **di berkas lokal** `data/bendahara.sqlite`. Pengguna awal adalah `admin` dengan password `admin`; yang disimpan ke database hanya hash bcrypt.

## Langkah
1. Gunakan server Node.js untuk menyajikan antarmuka web responsif dan endpoint API.
2. Buat berkas SQLite otomatis saat server pertama kali dijalankan, dengan tabel `user` dan `transaksi`, relasi pemilik, dan indeks pencarian.
3. Buat akun awal `admin` secara idempoten dengan hash bcrypt. Jangan menyimpan password teks biasa di tabel.
4. Implementasikan login, logout, cookie sesi bertanda tangan, dan CRUD transaksi yang memeriksa pemilik di server.
5. Gunakan antarmuka yang ada untuk login, dashboard, filter, form transaksi, dan CSV; semua transaksi dibaca dari API.
6. Uji isi berkas SQLite, login benar/salah, API tanpa sesi, CRUD, persistensi setelah server dimulai ulang, dan tampilan ponsel.
7. Dokumentasikan cara menjalankan server dan cara membuka dari ponsel dalam jaringan yang sama.

## Kriteria penerimaan
- `data/bendahara.sqlite` benar-benar muncul dan berisi tabel `user` serta `transaksi`.
- Baris `admin` memiliki `password_hash` bcrypt; login `admin`/`admin` berhasil dan password salah ditolak.
- Transaksi yang dibuat lewat API berada di berkas, dapat dibaca setelah server dimulai ulang, dan tidak dapat diakses tanpa login.
- Halaman login dan dashboard tetap dapat digunakan pada lebar layar 320 px.

## Batasan
- Berkas SQLite ada pada komputer/server yang menjalankan Node.js. Agar ponsel dapat mengaksesnya, server dan ponsel harus saling terhubung melalui jaringan atau server tersebut perlu dihosting pada layanan dengan disk persisten.
- Site lama yang pernah dipublikasikan memakai D1 dan tidak tersambung ke berkas lokal ini.
- Data lama di D1/localStorage tidak dipindahkan otomatis.
