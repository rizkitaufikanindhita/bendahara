# PRD — Aplikasi Bendahara

## Ringkasan
Aplikasi web untuk bendahara mencatat pemasukan dan pengeluaran, memantau saldo, serta menyiapkan rekap yang mudah dibaca di komputer dan ponsel. Versi awal ditujukan untuk satu pengguna pada satu browser.

## Pengguna dan kebutuhan
- Bendahara organisasi kecil perlu memasukkan transaksi dengan cepat dan melihat saldo terkini.
- Pengurus perlu membaca ringkasan dan daftar transaksi melalui tampilan yang jelas.
- Bendahara perlu mencari catatan, menyaring periode, dan mengunduh data untuk pelaporan.

## Lingkup versi awal
1. Tambah, ubah, dan hapus transaksi dengan tanggal, jenis, nominal, kategori, keterangan, dan catatan opsional.
2. Dashboard menampilkan saldo, total pemasukan, total pengeluaran, dan jumlah transaksi sesuai filter.
3. Cari berdasarkan keterangan, kategori, atau catatan; filter jenis dan bulan.
4. Ekspor transaksi terfilter ke CSV dengan format yang dapat dibuka spreadsheet.
5. Simpan data di localStorage browser, tanpa akun atau sinkronisasi lintas perangkat.
6. Antarmuka bahasa Indonesia, format rupiah, dapat dioperasikan dengan keyboard, label formulir, dan tata letak ponsel.

## Aturan data
- Nominal harus lebih dari nol; nilai uang dicatat sebagai bilangan bulat rupiah.
- Tanggal, jenis, kategori, dan keterangan wajib diisi.
- Saldo = seluruh pemasukan dikurangi seluruh pengeluaran. Angka ringkasan saat filter aktif dihitung dari transaksi yang tampil.
- Urutan transaksi dari tanggal terbaru, lalu waktu pencatatan terbaru.
- Penghapusan memerlukan konfirmasi. Data browser dapat hilang bila penyimpanan situs dibersihkan.

## Alur utama
1. Pengguna membuka dashboard dan melihat saldo seluruh catatan.
2. Pengguna memilih “Tambah transaksi”, mengisi formulir, lalu menyimpan.
3. Dashboard dan daftar langsung diperbarui.
4. Pengguna dapat mencari, menyaring bulan/jenis, mengubah atau menghapus transaksi, lalu mengunduh CSV.

## Kriteria penerimaan
- Formulir menolak nominal nol/negatif dan kolom wajib kosong.
- Tambah, ubah, hapus memperbarui saldo dan daftar tanpa memuat ulang halaman.
- Setelah halaman dimuat ulang pada browser yang sama, data tetap ada.
- Filter dan pencarian konsisten dengan ringkasan serta isi CSV.
- Lebar 320 px tetap dapat dipakai tanpa gulir mendatar halaman; tombol dan label mudah digunakan lewat sentuh dan keyboard.
- Status penyimpanan, hasil tindakan, dan keadaan kosong tersampaikan lewat teks.

## Di luar versi awal
Akun, izin banyak pengguna, penyimpanan cloud, lampiran bukti, persetujuan transaksi, dan rekonsiliasi bank. Fitur tersebut membutuhkan rancangan autentikasi serta penyimpanan server agar data organisasi dapat dibagikan dengan aman.
