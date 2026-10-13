# Implementation plan — login dan SQLite

## Tujuan
Mengganti penyimpanan transaksi di browser dengan database SQLite pada hosting (Cloudflare D1), serta menambahkan login aplikasi menggunakan pengguna awal `admin` dan kata sandi awal `admin`. Kata sandi disimpan sebagai hash bcrypt, bukan teks asli.

## Langkah implementasi
1. Ubah proyek statis menjadi aplikasi server yang tetap menyajikan antarmuka responsif yang ada.
2. Tambahkan skema SQLite: tabel `users` untuk identitas dan hash kata sandi, serta tabel `transactions` untuk catatan keuangan dengan relasi pemilik.
3. Buat migrasi skema yang dijalankan saat deploy. Buat pengguna awal secara idempoten saat login pertama jika tabel pengguna masih kosong.
4. Tambahkan endpoint login, logout, pemeriksaan sesi, serta CRUD transaksi. Validasi seluruh input dan hak akses di server.
5. Gunakan cookie sesi `HttpOnly`, `Secure` saat HTTPS, `SameSite=Lax`, dan tanda tangan HMAC. Hash dan verifikasi kata sandi menggunakan bcrypt.
6. Ubah frontend agar menampilkan layar login dan membaca/menulis transaksi melalui API, bukan localStorage.
7. Uji login berhasil/gagal, pembatasan API tanpa sesi, CRUD, persistensi database, dan tata letak ponsel. Bangun dan publikasikan versi baru.

## Kriteria selesai
- Tabel `users` dan `transactions` tersedia di SQLite dengan migrasi yang tercatat.
- Akun awal `admin`/`admin` dapat masuk, dan `users.password_hash` berisi hash bcrypt.
- API transaksi menolak permintaan tanpa sesi; hanya transaksi pemilik yang dapat diubah/dihapus.
- Data transaksi tetap ada setelah halaman dimuat ulang dan saat dibuka dari perangkat lain dengan akun yang sama.
- Login, dashboard, form transaksi, dan logout dapat digunakan di komputer dan ponsel.

## Batasan
- Kata sandi awal `admin` adalah permintaan eksplisit, sehingga harus segera diganti sebelum data nyata dipakai. Pergantian kata sandi dan multiakun dapat ditambahkan pada iterasi berikutnya.
- Data localStorage versi terdahulu tidak dipindahkan otomatis; pengguna dapat mengunduh CSV dari versi sebelumnya sebelum beralih.
