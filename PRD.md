# PRD — Aplikasi Bendahara

## Ringkasan
Aplikasi web untuk bendahara mencatat pemasukan dan pengeluaran, memantau saldo, serta menyiapkan rekap yang mudah dibaca di komputer dan ponsel. Data transaksi tersimpan dalam berkas SQLite di komputer/server yang menjalankan aplikasi. Perangkat lain dapat mengakses data yang sama melalui server tersebut.

## Pengguna dan kebutuhan
- Bendahara organisasi kecil perlu memasukkan transaksi dengan cepat dan melihat saldo terkini.
- Pengurus perlu membaca ringkasan dan daftar transaksi melalui tampilan yang jelas.
- Bendahara perlu mencari catatan, menyaring periode, dan mengunduh data untuk pelaporan.

## Lingkup versi awal
1. Tambah, ubah, dan hapus transaksi dengan tanggal, jenis, nominal, kategori, keterangan, dan catatan opsional.
2. Dashboard menampilkan saldo, total pemasukan, total pengeluaran, dan jumlah transaksi sesuai filter.
3. Cari berdasarkan keterangan, kategori, atau catatan; filter jenis dan bulan.
4. Ekspor transaksi terfilter ke CSV dengan format yang dapat dibuka spreadsheet.
5. Login dan logout dengan akun bendahara. Akun awal `admin`/`admin`; password disimpan sebagai hash bcrypt.
6. Simpan pengguna dan transaksi dalam tabel `user` dan `transaksi` di berkas `data/bendahara.sqlite`. API transaksi mensyaratkan sesi login.
7. Antarmuka bahasa Indonesia, format rupiah, dapat dioperasikan dengan keyboard, label formulir, dan tata letak ponsel.

## Aturan data
- Nominal harus lebih dari nol; nilai uang dicatat sebagai bilangan bulat rupiah.
- Tanggal, jenis, kategori, dan keterangan wajib diisi.
- Saldo = seluruh pemasukan dikurangi seluruh pengeluaran. Angka ringkasan saat filter aktif dihitung dari transaksi yang tampil.
- Urutan transaksi dari tanggal terbaru, lalu waktu pencatatan terbaru.
- Penghapusan memerlukan konfirmasi. Berkas SQLite perlu dicadangkan secara berkala.

## Alur utama
1. Pengguna masuk dengan akun bendahara, lalu melihat saldo seluruh catatan.
2. Pengguna memilih “Tambah transaksi”, mengisi formulir, lalu menyimpan.
3. Dashboard dan daftar langsung diperbarui.
4. Pengguna dapat mencari, menyaring bulan/jenis, mengubah atau menghapus transaksi, lalu mengunduh CSV.

## Kriteria penerimaan
- Formulir menolak nominal nol/negatif dan kolom wajib kosong.
- Tambah, ubah, hapus memperbarui saldo dan daftar tanpa memuat ulang halaman.
- Setelah halaman dimuat ulang atau dibuka pada perangkat lain dengan akun yang sama, data tetap ada.
- Permintaan transaksi tanpa sesi login mendapat respons 401.
- Filter dan pencarian konsisten dengan ringkasan serta isi CSV.
- Lebar 320 px tetap dapat dipakai tanpa gulir mendatar halaman; tombol dan label mudah digunakan lewat sentuh dan keyboard.
- Status penyimpanan, hasil tindakan, dan keadaan kosong tersampaikan lewat teks.

## Di luar versi awal
Manajemen banyak pengguna, lampiran bukti, persetujuan transaksi, dan rekonsiliasi bank. Pergantian password dan pemindahan data lama dari localStorage belum disertakan.
