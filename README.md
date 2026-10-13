# Bendahara

Aplikasi web pencatatan keuangan dengan login dan **SQLite dalam berkas**. Database dibuat otomatis di `data/bendahara.sqlite` saat server pertama kali dijalankan. Tabelnya bernama `user` dan `transaksi`.

## Menjalankan

Perlu Node.js versi 22.13 atau lebih baru.

```powershell
cd D:\IT\apps_bendahara
npm install
npm start
```

Buka `http://localhost:3000` di browser. Login awal: **admin / admin**. Password disimpan sebagai hash bcrypt, bukan teks biasa. Server perlu tetap berjalan selama aplikasi digunakan; hentikan dengan `Ctrl+C`.

Untuk membuka dari ponsel dalam jaringan Wi-Fi yang sama, jalankan server agar mendengarkan koneksi jaringan:

```powershell
$env:HOST = '0.0.0.0'
npm start
```

Di ponsel, buka `http://IP-KOMPUTER:3000`. IP komputer dapat dilihat dengan `ipconfig`. Komputer harus tetap menyala; aturan firewall mungkin perlu mengizinkan port 3000 pada jaringan pribadi. Karena HTTP di jaringan lokal tidak mengenkripsi lalu lintas, gunakan hanya jaringan yang dipercaya. Untuk akses dari internet, tempatkan aplikasi pada server Node dengan disk persisten dan HTTPS.

## Data dan cadangan

- Lokasi database: `data/bendahara.sqlite` (diabaikan Git).
- Cadangkan berkas SQLite saat server berhenti, atau gunakan fitur **Unduh CSV** untuk salinan transaksi.
- Sesi login akan berakhir saat server dimulai ulang; data transaksi tetap ada dalam berkas.
- Jika berkas dihapus, aplikasi akan membuat database baru dengan akun awal `admin`/`admin`.
- Data dari versi lama (D1 atau localStorage) tidak dipindahkan otomatis.

Site yang sebelumnya dipublikasikan dengan Cloudflare D1 adalah versi lama dan **tidak memakai berkas SQLite lokal ini**.

Lihat [PRD.md](PRD.md) dan [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) untuk cakupan dan langkah implementasi.
