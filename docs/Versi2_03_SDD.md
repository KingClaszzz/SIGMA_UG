**PENGELOLAAN PROYEK SISTEM INFORMASI**

**SOFTWARE DESIGN DOCUMENT (SDD)**

Draf: Minggu ke-7 · Final: Minggu ke-8 (vclass)

| Judul Proyek | : SIGMA UG |
| --- | --- |
| Klien | : Ibu Lilis Kusnitawati |
| Nama Kelompok | : Paguyuban Absen Akhir + 1 |
| Kelas | : 4KA01 |
| Tanggal Pengumpulan | : 24 November 2026 |

**Anggota Kelompok**

| **No** | **NPM** | **Nama Lengkap** | **Peran dalam Tim** |
| --- | --- | --- | --- |
| 1 | 11123361 | Zaki Faeyza Hakim | Project Manager |
| 2 | 11123375 | Zuhdi Azizi | Programmer |
| 3 | 10123008 | Raden Arya Nur Putra Kusumanegara | Programmer |
| 4 | 11123330 | Vanessa | System Analyst |
| 5 | 11123129 | Ravina Aisya Putri Nugroho | System Designer |
| 6 | 10123207 | Aulia Indri Armalita | Technical Writer |
| 7 | 10123011 | Zaldi Sufi Muqorrobin | Tester |

**PROGRAM STUDI SISTEM INFORMASI**

**FAKULTAS ILMU KOMPUTER DAN TEKNOLOGI INFORMASI**

**UNIVERSITAS GUNADARMA**

**2026**

| **Petunjuk umum** • CPMK: CPMK 3.3 (Sub-CPMK 03.3.3) · Bobot 15% • Ketentuan: Minimal 10 halaman (tidak termasuk cover & lampiran) • Teks abu-abu miring (termasuk baris “Contoh”) adalah petunjuk/contoh pengisian — hapus atau ganti sebelum dikumpulkan. • Format: Times New Roman 12, spasi 1,5, margin 3-3-3-3 cm (sudah diatur di template ini). **Langkah pengisian** 1\. Mulai dari kebutuhan di SRS: setiap FR harus tercakup di desain (cek dengan matriks keterlacakan di bab 8). 2\. Gambar arsitektur dan jelaskan setiap komponen serta teknologinya. 3\. Buat ERD dan kamus data untuk setiap tabel basis data. 4\. Buat wireframe/mockup untuk setiap halaman utama dan kaitkan dengan FR. 5\. Bab 6 diisi hanya jika sistem memakai perhitungan/algoritma; jika tidak, tulis “Tidak ada”. 6\. Minggu 7: diskusikan draf di kelas; Minggu 8: kumpulkan versi final di vclass. 7\. Mulai persiapan pemrograman secara paralel sejak Minggu 7: setup repository, framework, dan basis data sesuai desain. **Aspek yang dinilai dosen (skor 1–4 per aspek)** ✓ Detail arsitektur sistem ✓ Desain prototipe: proses bisnis, user interface, basis data ✓ Desain pemodelan matematis / simulasi (jika ada) ✓ Kelengkapan dokumen rancangan sistem (SDD) |
| --- |

# Riwayat Revisi

| **Versi** | **Tanggal** | **Penyusun** | **Uraian Perubahan** |
| --- | --- | --- | --- |
| 1.0 | 12/11/2026 | Aulia Indri Ravina Aisya Putri Nugroho   Zaki Faeyza Hakim   Zuhdi Azizi | Arahan Bu Naeli: Bagian activity diagram yang bagian end harusnya hanya 1. Kamus data di bawah tabel ditambahkan penjelasan. Nama panjang karakter jangan sampai 100. |
| 2.0 | 21/11/2026 | Aulia Indri Ravina Aisya Putri Nugroho   Zaki Faeyza Hakim   Zuhdi Azizi | Arahan Bu Lilis: Arahan Bu Naeli: |
|  |  |  |  |

# Lembar Persetujuan

Dokumen ini telah diperiksa dan disetujui oleh pihak - pihak berikut :

| **Peran** | **Nama** | **Tanda Tangan** | **Tanggal** |
| --- | --- | --- | --- |
| Project Manager (Tim) | Zaki Faeyza Hakim | ![](images/image-001.jpg) | 18/11/2026 |
| Perwakilan Mitra/Klien | Lilis Kusnitawati | ![](images/image-002.png) | 18/11/2026 |
| Dosen Pengampu | Naeli Umniati |  |  |

# **1\. Pendahuluan**

## **1.1 Tujuan Dokumen**

Dokumen Software Design Document (SDD) ini menjelaskan rancangan teknis SIGMA UG berdasarkan kebutuhan yang telah ditetapkan dalam Software Requirement Specification (SRS) Versi 2.0. Dokumen ini menjadi pedoman bagi programmer dalam membangun sistem, bagi tester dalam menyiapkan pengujian, dan bagi tim dalam memastikan setiap kebutuhan fungsional (FR) memiliki rancangan proses, data, dan antarmuka yang sesuai.

## **1.2 Ruang Lingkup**

SIGMA UG merupakan aplikasi berbasis web untuk mengelola proses magang mahasiswa Program Studi Sistem Informasi Universitas Gunadarma. Rancangan mencakup tiga peran pengguna (Mahasiswa, Admin Prodi, dan Dosen Pendamping), sembilan modul utama, pengelolaan data mahasiswa dan periode, pengajuan serta penerbitan surat rekomendasi, unggah berkas konversi, penentuan konversi SKS, penerbitan surat konversi, dan monitoring magang. Integrasi otomatis dengan StudentSite, akses langsung perusahaan mitra, dan tanda tangan digital dosen belum menjadi bagian implementasi wajib. Rancangan juga mencakup kebutuhan _Should_, yaitu data diri mahasiswa, status pengajuan, penetapan dosen pendamping, logbook, laporan akhir, dan notifikasi email, sesuai Tabel 8 MoSCoW pada SRS.

## **1.3 Referensi**

Referensi yang digunakan dalam penyusunan SDD ini adalah sebagai berikut:

A. Dokumen Definisi & Perencanaan Proyek SIGMA UG Versi 2.0 (Bagian I: Requirement Document, Bagian II: Perencanaan Proyek).

B. Software Requirement Specification (SRS) SIGMA UG Versi 2.0, 6 November 2026.

C. Notulen Rapat Proyek NOT-01, 7 Oktober 2026 (wawancara pertama dengan Ibu Lilis Kusnitawati).

D. Notulen Rapat Proyek NOT-02, 30 Oktober 2026 (wawancara kedua via Zoom).

E. Petunjuk penyusunan SDD mata kuliah Pengelolaan Proyek Sistem Informasi, CPMK 3.3 (Sub-CPMK 03.3.3).

# **2\. Arsitektur Sistem**

SIGMA UG menggunakan arsitektur _three-tier_ berbasis client–server. Lapisan presentasi berupa aplikasi React.js yang berjalan di peramban pengguna. Lapisan aplikasi berupa REST API Node.js yang menangani autentikasi, hak akses, dan logika sembilan modul. Lapisan data berupa basis data PostgreSQL dan penyimpanan berkas. Seluruh komponen sisi server berjalan pada satu VPS Hostinger KVM 2 bersistem operasi Ubuntu Server. Nginx berfungsi sebagai pintu masuk tunggal yang melayani HTTPS, menyajikan berkas React, dan meneruskan permintaan /api ke Node.js. Rancangan ini memenuhi NFR-02 (HTTPS dan pembatasan akses), NFR-04 (backup berkala dan pemantauan uptime), dan NFR-06 (kode modular dan templat surat terpisah dari kode).

| ![](images/image-003.png) |
| --- |

**Gambar 1. Arsitektur sistem**

**Tabel 1. Komponen Arsitektur**

| **No** | **Komponen** | **Fungsi** | **Teknologi** |
| --- | --- | --- | --- |
| 1 | Peramban Web (Pengguna) | Sarana Mahasiswa, Admin Prodi, dan Dosen Pendamping mengakses sistem dari komputer atau ponsel | Peramban modern (Chrome, Firefox, Edge), tampilan responsif |
| 2 | Frontend (Lapisan Presentasi) | Menampilkan halaman awal dan timeline, login dan data diri, form pengajuan dan unggah berkas, dashboard rekap, serta halaman monitoring dosen | React.js (rancangan UI di Figma) |
| 3 | Backend API (Lapisan Aplikasi) | Memproses permintaan dari frontend dan menjalankan logika bisnis | Node.js, REST API (JSON) via HTTPS |
| 4 | Autentikasi dan Hak Akses | Login dengan akun web atau Google, membatasi akses menurut 3 peran, kata sandi ter-hash, sesi berakhir setelah 30 menit | Node.js, HTTPS |
| 5 | Sembilan Modul Sistem | Informasi Periode, Pengajuan Surat Rekomendasi, Validasi Syarat, Dashboard Rekap, Penerbitan Surat Rekomendasi, Unggah Berkas Konversi, Konversi SKS, Penerbitan Surat Konversi, Monitoring Magang | Node.js |
| 6 | Pembuat PDF Surat | Membuat PDF surat rekomendasi dan surat konversi dari templat | Pustaka PDF memakai PDF generator javascript dengan pdf-lib dan pdf-kit |
| 7 | Pengelola Berkas | Mengelola unggahan dan unduhan dokumen | Node.js |
| 8 | Layanan Notifikasi Email | Mengirim email saat pengajuan masuk dan saat surat selesai (FR-17) | SMTP lewat Google |
| 10 | Penyimpanan Berkas | Menyimpan surat penerimaan, silabus, logbook, laporan akhir, sertifikat, nilai mitra, dan PDF surat | Penyimpanan file di server pakai PostGreSQL disimpan ke Hostinger (demo di Vercel + Supabase) |
| 11 | Template Surat | Format surat rekomendasi dan surat konversi, dipisah dari kode supaya mudah diubah (NFR-06) | Berkas templat dan PDF generator javascript dengan pdf-lib dan pdf-kit |
| 12 | Google Account | Layanan login OAuth | OAuth 2.0 |
| 13 | Server Hosting / Server Kampus | Menjalankan frontend, backend, dan basis data | Hostinger (demo di Vercel + Supabase) |

#

# **3\. Desain Proses Bisnis**

| _![](images/image-004.png)_ |
| --- |

**Gambar 2. Activity Diagram Proses Pengajuan dan Penerbitan Surat Rekomendasi**

Gambar 2 proses dimulai ketika Admin Prodi mengatur periode dan jadwal magang (gelombang pendaftaran, batas konversi, dan batas laporan), lalu sistem menampilkannya sebagai timeline di halaman awal. Mahasiswa kemudian login, melengkapi data diri (NPM, IPK, SKS, semester, dan riwayat magang), dan mengajukan surat rekomendasi selama periode dibuka. Sistem menyimpan pengajuan, menampilkannya pada dashboard rekap, dan mengirim email konfirmasi. Admin Prodi memverifikasi data diri dan memeriksa persyaratan: mahasiswa aktif, tidak cuti, tidak memiliki nilai E, IPK minimal 3, semester 5 atau lebih, dan belum magang dua kali. Jika syarat tidak terpenuhi, sistem menandai pengajuan sebagai ditolak dan memberi tahu mahasiswa, sehingga proses berhenti. Jika terpenuhi, Admin Prodi menyetujui pengajuan, sistem menerbitkan surat rekomendasi dalam format PDF dari templat dan mengirim notifikasi email. Mahasiswa lalu mengunduh surat tersebut dan memakainya untuk mendaftar magang ke perusahaan mitra.

##

| ![](images/image-005.png) |
| --- |

**Gambar 3. Activity Diagram Proses Konversi SKS dan Penerbitan Surat Konversi**

Gambar 3 proses dimulai setelah mahasiswa diterima magang oleh perusahaan mitra. Mahasiswa menentukan apakah akan mengonversi magangnya menjadi SKS. Jika tidak, proses selesai sebagai magang mandiri. Jika ya, mahasiswa mengunggah surat penerimaan dan silabus, lalu sistem menyimpannya dan menampilkannya pada dashboard Admin Prodi. Admin Prodi memeriksa kelengkapan berkas. Jika belum lengkap, sistem mengembalikan berkas dan memberi tahu mahasiswa agar mengunggah ulang. Jika lengkap, Admin Prodi meninjau silabus dan menentukan mata kuliah beserta SKS konversinya, kemudian menetapkan dosen pendamping. Setelah itu sistem menerbitkan surat konversi dalam format PDF dan mengirim notifikasi email. Mahasiswa mengunduh surat tersebut dan menandatanganinya secara basah di luar sistem (offline), sesuai kesepakatan dengan klien.

##

| ![](images/image-006.png) |
| --- |

**Gambar 5. Activity Diagram Proses Logbook hingga Laporan Akhir**

Proses ini berjalan selama dan setelah magang. Mahasiswa mengisi atau mengunggah logbook (atau ringkasan kegiatan bila perusahaan tidak menyediakan format logbook), lalu sistem menyimpannya dan menampilkannya pada daftar mahasiswa bimbingan. Dosen Pendamping memantau logbook dan progres mahasiswa, dengan pemberian feedback yang bersifat opsional. Di akhir magang, mahasiswa menyusun laporan akhir memakai templat prodi, kemudian dosen pendamping memeriksa dan menandatanganinya (mitra juga menandatangani). Mahasiswa lalu mengunggah laporan akhir yang sudah bertanda tangan bersama sertifikat dan nilai dari mitra. Sistem menyimpan dokumen dan memeriksa apakah ketiganya lengkap dan terkumpul sebelum batas waktu. Jika belum, mahasiswa diminta melengkapi dan mengunggah ulang. Jika sudah, Dosen Pendamping memeriksa kelengkapan dan kesesuaian dokumen, lalu sistem mengubah status magang menjadi Selesai.

# **4\. Desain Basis Data**

## **4.1 Entity Relationship Diagram**

| ![](images/image-007.png) |
| --- |

**Gambar 6. Entity Relationship Diagram**

## **4.2 Kamus Data**

Seluruh kolom ID dengan tipe SERIAL merupakan bilangan bulat yang dibuat otomatis oleh PostgreSQL. Nilainya dimulai dari 1 dan bertambah 1 setiap ada data baru, misalnya 1, 2, 3, dan seterusnya. Nilai ini hanya dipakai di dalam sistem dan tidak ditampilkan kepada pengguna. Kolom bertipe DATE disimpan dengan format YYYY-MM-DD (contoh: 2026-11-17), sedangkan TIMESTAMP disimpan dengan format YYYY-MM-DD hh:mm:ss (contoh: 2026-11-17 08:30:00). Kolom BOOLEAN hanya bernilai TRUE atau FALSE.

**Tabel 2. Struktur Tabel: users**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_user | SERIAL | \- | PK |
| 2 | email | VARCHAR | 100 | Not Null (Unique) |
| 3 | auth\_id | UUID | \- | Not Null (Unique) |
| 4 | nama | VARCHAR | 60 | Not Null |
| 5 | peran | VARCHAR | 20 | Not Null |
| 6 | is\_aktif | BOOLEAN | \- | Default TRUE |
| 7 | last\_login | TIMESTAMPTZ | \- | Null |

Tabel users menyimpan akun seluruh pengguna, yaitu Mahasiswa, Admin Prodi, dan Dosen Pendamping. id\_user berupa angka urut otomatis, misalnya 1 untuk akun pertama. email berupa alamat email dengan format nama@domain (contoh: zaki@student.gunadarma.ac.id) dan tidak boleh sama antar-akun. password\_hash berisi kata sandi yang sudah diacak dengan bcrypt sepanjang 60 karakter berawalan “”. Kolom ini dikosongkan jika pengguna login dengan akun Google. google\_id berisi kode angka dari Google sepanjang 21 digit (contoh: 105839201746382910456) dan diisi otomatis saat pengguna pertama kali login dengan Google. nama berisi nama lengkap, maksimal 60 karakter. peran hanya boleh bernilai mahasiswa, admin, atau dosen. is\_aktif bernilai TRUE untuk akun aktif dan FALSE untuk akun yang dinonaktifkan. last\_login mencatat waktu login terakhir.

**Tabel 3. Struktur Tabel: Admin**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_admin | SERIAL | \- | PK |
| 2 | id\_user | INTEGER | \- | FK |
| 3 | nip | VARCHAR | 20 | Not Null |
| 4 | jabatan | VARCHAR | 50 | Not Null |
| 5 | no\_telepon | VARCHAR | 15 | Not Null |
| 6 | notif\_dibaca\_pada | TIMESTAMPTZ | \- | Not Null (Default now()) |

Fungsi utama tabel admin adalah menyimpan profil Admin Prodi. id\_admin menjadi identitas admin di dalam sistem, sedangkan id\_user menghubungkan admin ke akun loginnya. Kolom nip berisi nomor induk pegawai Universitas Gunadarma, tidak boleh sama antar-admin, dan formatnya disesuaikan dengan nomor induk yang dipakai kampus. Kolom jabatan berisi posisi admin, misalnya CP Magang atau Staf Layanan Jurusan SI. Sistem boleh memiliki beberapa admin dengan hak yang setara (FR-01). Setiap tindakan approval, pemeriksaan, dan penetapan menyimpan id\_admin agar pelakunya dapat ditelusuri.

**Tabel 4. Struktur Tabel: mahasiswa**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_mahasiswa | SERIAL | \- | PK |
| 2 | id\_user | INTEGER | \- | FK |
| 3 | npm | VARCHAR | 10 | Not Null |
| 4 | ipk | NUMERIC | 3,2 | Not Null |
| 5 | semester | SMALLINT | \- | Not Null |
| 6 | no\_telepon | VARCHAR | 15 | Not Null |
| 7 | status\_aktif | BOOLEAN | \- | Not Null |
| 8 | status\_cuti | BOOLEAN | \- | Not Null |
| 9 | ada\_nilai\_e | BOOLEAN | \- | Not Null |
| 10 | status\_verifikasi | VARCHAR | 20 | Not Null |
| 11 | catatan\_verifikasi | TEXT | \- | Null |
| 12 | diverifikasi\_oleh | INTEGER | \- | FK |
| 13 | diverifikasi\_pada | TIMESTAMPTZ | \- | Null |
| 14 | alamat | VARCHAR | 200 | Null |
| 15 | notif\_dibaca\_pada | TIMESTAMPTZ | \- | Not Null (Default now()) |

Pentingnya terdapat tabel mahasiswa menyimpan data diri yang diisi mahasiswa (FR-16). npm terdiri atas 8 digit angka sesuai NPM Universitas Gunadarma (contoh: 11123361) dan disimpan sebagai teks agar angka 0 di depan tidak hilang. ipk bernilai 0,00–4,00 (contoh: 3,45), dan no\_telepon berupa 10–13 digit berawalan 08. status\_verifikasi bernilai menunggu, terverifikasi, atau tidak\_sesuai. Kolom diverifikasi\_oleh kini merujuk ke admin.id\_admin, sehingga hanya admin yang dapat memberi approval data mahasiswa.

**Tabel 5. Struktur Tabel: dosen**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_dosen | SERIAL | \- | PK |
| 2 | id\_user | INTEGER | \- | FK |
| 3 | nidn | VARCHAR | 20 | Unique, Not Null |
| 4 | no\_telepon | VARCHAR | 15 | Not Null |
| 5 | notif\_dibaca\_pada | TIMESTAMPTZ | \- | Not Null (Default now()) |

Isi dari tabel dosen menyimpan profil dosen pendamping. id\_user menghubungkan dosen ke akunnya di tabel users. nidn berupa Nomor Induk Dosen Nasional sepanjang 10 digit angka (contoh: 0312088501). Nomor ini diberikan secara nasional dan tidak boleh sama antar-dosen. Kolom disediakan 20 karakter agar tetap muat jika prodi memakai NIP atau NUPTK. no\_telepon mengikuti format 08xxxxxxxxxx.

**Tabel 6. Struktur Tabel: riwayat\_magang**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_riwayat | SERIAL | \- | PK |
| 2 | id\_mahasiswa | INTEGER | \- | FK |
| 3 | nama\_perusahaan | VARCHAR | 150 | Not Null |
| 4 | tahun | SMALLINT | \- | Not Null |
| 5 | sumber | VARCHAR | 20 | Not Null |
| 6 | id\_penerimaan | INTEGER | \- | FK |

Penambahan tabel riwayat\_magang mencatat semua magang mahasiswa dan menjadi dasar pemeriksaan batas dua kali magang. nama\_perusahaan berupa teks bebas, maksimal 150 karakter. tahun berupa 4 digit tahun pelaksanaan magang (contoh: 2026). sumber bernilai input\_mahasiswa untuk magang sebelum SIGMA UG, termasuk magang mandiri, atau sistem untuk magang yang tercatat otomatis dari unggahan surat penerimaan. id\_penerimaan hanya terisi jika sumber bernilai sistem.

**Tabel 7. Struktur Tabel: periode\_magang**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_periode | SERIAL | \- | PK |
| 2 | tahun\_akademik | VARCHAR | 13 | Not Null |
| 3 | gelombang | SMALLINT | \- | Not Null |
| 4 | tgl\_buka | DATE | \- | Not Null |
| 5 | tgl\_tutup | DATE | \- | Not Null |
| 6 | tgl\_pengumuman | DATE | \- | Null |
| 7 | tgl\_mulai\_pelaksanaan | DATE | \- | Null |
| 8 | tgl\_selesai\_pelaksanaan | DATE | \- | Null |
| 9 | batas\_konversi | DATE | \- | Null |
| 10 | batas\_laporan | DATE | \- | Null |
| 11 | ketentuan | TEXT | \- | Null |
| 12 | dibuat\_oleh | INTEGER | \- | FK |
| 13 | nama\_periode | VARCHAR | 100 | Null |
| 14 | deskripsi | TEXT | \- | Null |
| 15 | status | VARCHAR | 14 | Not Null (Default dipublikasikan) |
| 16 | tgl\_buka\_konversi | DATE | \- | Null |
| 17 | tgl\_buka\_dokumen | DATE | \- | Null |
| 18 | min\_semester | SMALLINT | \- | Not Null (Default 5) |
| 19 | min\_ipk | NUMERIC | 3,2 | Not Null (Default 3.00) |
| 20 | semester | VARCHAR | 6 | Null |

Bentuk tabel periode\_magang yang menyimpan jadwal tiap gelombang (FR-09). Lalu tahun\_akademik memakai format mengikuti semester yaitu ATA atau PTA diikuti TTTT/TTTT (contoh: ATA 2026/2027), dan gelombang bernilai 1–3. Kolom tgl\_tutup tidak boleh lebih awal dari tgl\_buka, sedangkan tanggal lain boleh dikosongkan bila belum ditetapkan. Kolom dibuat\_oleh kini merujuk ke admin.id\_admin, karena hanya admin yang boleh mengatur periode.

**Tabel 8. Struktur Tabel: kategori\_perusahaan**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_kategori | SERIAL | \- | PK |
| 2 | nama\_kategori | VARCHAR | 50 | Not Null |
| 3 | is\_diizinkan | BOOLEAN | \- | Not Null |

Pada tabel kategori\_perusahaan adalah referensi jenis perusahaan tujuan magang, misalnya BUMN, Instansi Pemerintahan, TBK Nasional, Magenta, atau Swasta. nama\_kategori tidak boleh sama antar-kategori. is\_diizinkan bernilai TRUE jika kategori boleh dipilih. Jika bernilai FALSE, pengajuan ke kategori tersebut ditandai untuk ditolak saat validasi (FR-03).

**Tabel 9. Struktur Tabel: pengajuan\_rekomendasi**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_pengajuan | SERIAL | \- | PK |
| 2 | id\_mahasiswa | INTEGER | \- | FK |
| 3 | id\_periode | INTEGER | \- | FK |
| 4 | id\_kategori | INTEGER | \- | FK |
| 5 | nama\_perusahaan | VARCHAR | 150 | Not Null |
| 6 | kepada | VARCHAR | 100 | Not Null |
| 7 | alamat\_perusahaan | TEXT | \- | Not Null |
| 8 | status | VARCHAR | 20 | Not Null |
| 9 | alasan\_penolakan | TEXT | \- | Null |
| 10 | divalidasi\_oleh | INTEGER | \- | FK |
| 11 | divalidasi\_pada | TIMESTAMPTZ | \- | Null |
| 12 | tgl\_mulai | DATE | \- | Null |
| 13 | tgl\_selesai | DATE | \- | Null |
| 14 | dibuat\_pada | TIMESTAMPTZ | \- | Not Null (Default now()) |

Pada tabel pengajuan\_rekomendasi menyimpan setiap pengajuan surat rekomendasi (FR-02). Di tampilan, nomor pengajuan dapat ditampilkan sebagai REK-TTTT-NNNN (contoh: REK-2026-0001). status bernilai diajukan, disetujui, ditolak, atau diterbitkan. alasan\_penolakan wajib diisi jika status ditolak. Kolom divalidasi\_oleh kini merujuk ke admin.id\_admin, sehingga approval pengajuan hanya dapat dilakukan admin (FR-03, FR-04).

**Tabel 10. Struktur Tabel: penerimaan\_magang**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_penerimaan | SERIAL | \- | PK |
| 2 | id\_pengajuan | INTEGER | \- | FK |
| 3 | posisi | VARCHAR | 100 | Not Null |
| 4 | tgl\_mulai | DATE | \- | Not Null |
| 5 | tgl\_selesai | DATE | \- | Not Null |
| 6 | file\_surat\_penerimaan | VARCHAR | 255 | Null |
| 7 | pilih\_konversi | BOOLEAN | \- | Not Null |
| 8 | status | VARCHAR | 30 | Not Null |

Selanjutnya, ketersediaan tabel penerimaan\_magang mencatat surat penerimaan dari perusahaan (FR-06). Satu pengajuan hanya memiliki satu penerimaan. file\_surat\_penerimaan menyimpan lokasi berkas dengan format /uploads /penerimaan/ \[NPM\]\_\[id\_pengajuan\].pdf. pilih\_konversi bernilai FALSE secara default dan menjadi TRUE jika mahasiswa memilih konversi. status bernilai diterima\_perusahaan atau selesai.

**Tabel 11. Struktur Tabel: pengajuan\_konversi**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_konversi | SERIAL | \- | PK |
| 2 | id\_penerimaan | INTEGER | \- | FK |
| 3 | file\_silabus | VARCHAR | 255 | Null |
| 4 | status | VARCHAR | 20 | Not Null |
| 5 | alasan\_penolakan | TEXT | \- | Null |
| 6 | diperiksa\_oleh | INTEGER | \- | FK |
| 7 | diperiksa\_pada | TIMESTAMPTZ | \- | Null |
| 8 | ditetapkan\_oleh | INTEGER | \- | FK |
| 9 | ditetapkan\_pada | TIMESTAMPTZ | \- | Null |
| 10 | dibuat\_pada | TIMESTAMPTZ | \- | Not Null (Default now()) |

Tabel pengajuan\_konversi menyimpan pengajuan konversi SKS. Di tampilan, nomornya muncul sebagai KNV-TTTT-NNNN (contoh: KNV-2026-0001). file\_silabus memakai format /uploads/silabus/\[NPM\]\_\[id\_konversi\].pdf, dan status bernilai diajukan, ditinjau, ditolak, diproses, diterbitkan, atau selesai. Hak admin dicatat dalam dua tahap. Kolom diperiksa\_oleh dan diperiksa\_pada mencatat admin yang mengecek kelengkapan berkas (FR-06). Kolom ditetapkan\_oleh dan ditetapkan\_pada mencatat admin yang menetapkan hasil konversi (FR-07). Kedua kolom pelaku merujuk ke admin.id\_admin.

**Tabel 12. Struktur Tabel: mata\_kuliah**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_matkul | SERIAL | \- | PK |
| 2 | kode\_mk | VARCHAR | 15 | Not Null (Unique) |
| 3 | nama\_mk | VARCHAR | 50 | Not Null |
| 4 | sks | SMALLINT | \- | Not Null |

Pada tabel mata\_kuliah berisi daftar mata kuliah yang dapat dikonversi. kode\_mk mengikuti format kode mata kuliah Universitas Gunadarma, yaitu 2 huruf kode kelompok, tanda hubung, lalu 6 digit angka (contoh: AK-011415), dan tidak boleh sama antar-mata kuliah. nama\_mk maksimal 50 karakter (contoh: Pengelolaan Proyek Sistem Informasi). Kolom sks berupa angka 1–6 sesuai bobot resmi mata kuliah.

**Tabel 13. Struktur Tabel: detail\_konversi**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_detail | SERIAL | \- | PK |
| 2 | id\_konversi | INTEGER | \- | FK |
| 3 | id\_matkul | INTEGER | \- | FK |
| 4 | sks\_diakui | SMALLINT | \- | Not Null |
| 5 | keterangan | VARCHAR | 200 | Null |

Dalam tabel detail\_konversi, tersimpan suatu rincian mata kuliah hasil penetapan konversi oleh admin. Satu pengajuan konversi dapat memiliki beberapa baris. sks\_diakui harus lebih dari 0 dan tidak boleh melebihi SKS mata kuliahnya (contoh: 3). Data ini dipakai untuk mengisi surat konversi.

**Tabel 14. Struktur Tabel: penugasan\_dosen**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_penugasan | SERIAL | \- | PK |
| 2 | id\_konversi | INTEGER | \- | FK |
| 3 | id\_dosen | INTEGER | \- | FK |
| 4 | ditetapkan\_oleh | INTEGER | \- | FK |
| 5 | ditetapkan\_pada | TIMESTAMPTZ | \- | Not Null |

Pada tabel penugasan\_dosen, isinya mencatat dosen pendamping untuk setiap konversi yang disetujui (FR-11). Satu konversi hanya memiliki satu dosen, sedangkan satu dosen dapat membimbing banyak mahasiswa. Kolom ditetapkan\_oleh kini merujuk ke admin.id\_admin. ditetapkan\_pada terisi otomatis saat penugasan disimpan.

**Tabel 15. Struktur Tabel: dokumen\_akhir**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_dokumen | SERIAL | \- | PK |
| 2 | id\_penerimaan | INTEGER | \- | FK |
| 3 | jenis\_dokumen | VARCHAR | 20 | Not Null |
| 4 | file\_dokumen | VARCHAR | 255 | Null |
| 5 | nama\_asli | VARCHAR | 120 | Null |
| 6 | ringkasan | TEXT | \- | Null |
| 7 | status\_periksa | VARCHAR | 20 | Not Null (Default menunggu) |
| 8 | catatan\_dosen | TEXT | \- | Null |
| 9 | diperiksa\_oleh | INTEGER | \- | FK |
| 10 | diperiksa\_pada | TIMESTAMPTZ | \- | Null |
| 11 | ttd\_digital | BOOLEAN | \- | Not Null (Default FALSE) |
| 12 | diunggah\_pada | TIMESTAMPTZ | \- | Not Null (Default now()) |
| 13 | batas\_revisi | DATE | \- | Null |
| 14 | file\_ttd | VARCHAR | 255 | Null |
| 15 | nama\_ttd | VARCHAR | 120 | Null |
| 16 | ditandatangani\_pada | TIMESTAMPTZ | \- | Null |

Pada tabel dokumen\_akhir menyimpan seluruh dokumen yang diunggah mahasiswa di akhir magang (FR-12, FR-13). Kolom jenis\_dokumen bernilai laporan\_akhir, sertifikat, nilai\_mitra, atau logbook, dan setiap jenis hanya boleh diunggah satu kali per penerimaan magang. Laporan akhir, sertifikat, dan nilai mitra wajib diunggah (BR-06), sedangkan logbook bersifat opsional, sehingga sistem tetap menganggap dokumen lengkap meskipun logbook tidak diunggah. file\_dokumen memakai format /uploads/dokumen/\[NPM\]\_\[jenis\_dokumen\].pdf (contoh: /uploads/dokumen/11123361\_logbook.pdf). status\_periksa bernilai belum atau sudah\_diperiksa, dan diperiksa\_oleh merujuk ke dosen.id\_dosen (FR-14). ttd\_digital bernilai FALSE secara default (FR-15).

**Tabel 16. Struktur Tabel: template\_surat**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_template | SERIAL | \- | PK |
| 2 | jenis\_surat | VARCHAR | 20 | Not Null |
| 3 | nama\_template | VARCHAR | 100 | Not Null |
| 4 | file\_template | VARCHAR | 255 | Not Null |
| 5 | is\_aktif | BOOLEAN | \- | Not Null (TRUE) |

Pada template\_surat menyimpan templat surat rekomendasi dan surat konversi. jenis\_surat bernilai rekomendasi atau konversi. file\_template memakai format /templates/\[jenis\_surat\]\_v\[versi\].html (contoh: /templates/rekomendasi\_v1.html) dan disimpan terpisah dari kode program (NFR-06). Untuk setiap jenis surat, hanya satu templat yang boleh berstatus is\_aktif = TRUE.

**Tabel 17. Struktur Tabel: surat**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_surat | SERIAL | \- | PK |
| 2 | jenis\_surat | VARCHAR | 20 | Not Null |
| 3 | nomor\_surat | VARCHAR | 50 | Not Null |
| 4 | id\_pengajuan | INTEGER | \- | FK |
| 5 | id\_konversi | INTEGER | \- | FK |
| 6 | id\_template | INTEGER | \- | FK |
| 7 | file\_pdf | VARCHAR | 255 | Not Null |
| 8 | diterbitkan\_oleh | INTEGER | \- | FK |
| 9 | diterbitkan\_pada | TIMESTAMPTZ | \- | Not Null |

Pada tabel di mana surat menyimpan surat PDF yang diterbitkan (FR-05, FR-08). nomor\_surat memakai format NNN/KODE/SI-UG/BLN/TTTT (contoh: 007/REK/SI-UG/XI/2026), dengan KODE bernilai REK atau KNV. Format ini perlu disesuaikan dengan format surat prodi. Surat rekomendasi mengisi id\_pengajuan, sedangkan surat konversi mengisi id\_konversi. file\_pdf memakai format /surat/\[KODE\]_\[NPM\]_\[TTTTMMDD\].pdf. Kolom diterbitkan\_oleh kini merujuk ke admin.id\_admin.

**Tabel 18. Struktur Tabel: notifikasi\_email**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_notifikasi | SERIAL | \- | PK |
| 2 | id\_user | INTEGER | \- | FK |
| 3 | jenis\_event | VARCHAR | 30 | Not Null |
| 4 | subjek | VARCHAR | 150 | Not Null |
| 5 | status\_kirim | VARCHAR | 10 | Not Null |
| 6 | dikirim\_pada | TIMESTAMPTZ | \- | Null |

Selanjutnya, pada tabel notifikasi\_email mencatat email yang dikirim sistem (FR-17). jenis\_event bernilai pengajuan\_terkirim atau surat\_terbit. subjek berisi judul email (contoh: “\[SIGMA UG\] Surat Rekomendasi Anda Telah Terbit”). status\_kirim bernilai terkirim atau gagal, dan email yang gagal dapat dikirim ulang.

**Tabel 19. Struktur Tabel: riwayat\_status**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_riwayat\_status | SERIAL | \- | PK |
| 2 | jenis\_objek | VARCHAR | 30 | pengajuan\_rekomendasi/pengajuan\_konversi |
| 3 | id\_objek | INTEGER | \- | FK |
| 4 | status\_lama | VARCHAR | 20 | Null |
| 5 | status\_baru | VARCHAR | 20 | Not Null |
| 6 | diubah\_oleh | INTEGER | \- | FK |
| 7 | diubah\_pada | TIMESTAMPTZ | \- | Not Null |

Riwayat\_status adalah tabel yang mencatat setiap perubahan status pengajuan (FR-10). jenis\_objek bernilai pengajuan\_rekomendasi atau pengajuan\_konversi, sedangkan id\_objek berisi ID baris pada tabel tersebut (contoh: pengajuan\_rekomendasi dengan id\_objek = 15). Kolom diubah\_oleh tetap merujuk ke users.id\_user, karena perubahan status bisa dilakukan mahasiswa (mengirim pengajuan) maupun admin (menyetujui atau menolak).

**Tabel 20. Struktur Tabel: dokumen\_pengajuan**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_dokumen | SERIAL | \- | PK |
| 2 | id\_pengajuan | INTEGER | \- | FK |
| 3 | jenis\_dokumen | VARCHAR | 30 | Not Null |
| 4 | file\_dokumen | VARCHAR | 255 | Not Null |
| 5 | nama\_asli | VARCHAR | 120 | Not Null |
| 6 | ukuran | INTEGER | \- | Not Null |
| 7 | diunggah\_pada | TIMESTAMPTZ | \- | Not Null (Default now()) |

Pada bagian tabel dokumen\_pengajuan ini menyimpan dokumen persyaratan yang diunggah mahasiswa pada pengajuan surat rekomendasi (FR-02). jenis\_dokumen bernilai rangkuman\_nilai, bukti\_pembayaran, surat\_izin\_orang\_tua, atau contoh\_surat\_perusahaan, dan setiap jenis hanya boleh diunggah satu kali per pengajuan. Tiga jenis pertama wajib diunggah sebelum pengajuan dikirim, sedangkan contoh\_surat\_perusahaan bersifat opsional. file\_dokumen menyimpan lokasi berkas pada penyimpanan berkas, nama\_asli menyimpan nama berkas asli (maksimal 120 karakter), dan ukuran berisi ukuran berkas dalam byte (maksimal 2 MB). diunggah\_pada terisi otomatis dan diperbarui saat berkas diganti. Baris ikut terhapus bila pengajuan induknya dihapus.

**Tabel 21. Struktur Tabel: riwayat\_dokumen**

| **No** | **Nama Field** | **Tipe Data** | **Panjang** | **Keterangan (PK/FK/Null)** |
| --- | --- | --- | --- | --- |
| 1 | id\_riwayat | SERIAL | \- | PK |
| 2 | id\_dokumen | INTEGER | \- | FK |
| 3 | aksi | VARCHAR | 20 | Not Null |
| 4 | oleh | INTEGER | \- | FK |
| 5 | catatan | TEXT | \- | Null |
| 6 | waktu | TIMESTAMPTZ | \- | Not Null (Default now()) |

Terakhir, pada riwayat\_dokumen mencatat setiap kejadian pada dokumen akhir magang (FR-14). aksi bernilai diunggah, disetujui, perbaikan, atau ditandatangani. Kolom oleh merujuk ke users.id\_user karena pelakunya dapat berupa mahasiswa (mengunggah) maupun dosen (memeriksa dan menandatangani). catatan berisi catatan dosen saat meminta perbaikan. Data ini dipakai untuk riwayat dokumen pada Monitoring Magang dan Aktivitas Mahasiswa serta untuk notifikasi.

# **5\. Desain Antarmuka Pengguna**

Desain antarmuka SIGMA UG disusun berdasarkan kebutuhan fungsional pada SRS Versi 2.0 dan dirancang menggunakan Figma. Antarmuka menggunakan bahasa Indonesia dengan tampilan sederhana dan responsif agar dapat dipakai di komputer maupun ponsel (NFR-03, NFR-05). Halaman dikelompokkan berdasarkan tiga peran pengguna. Setelah login, setiap pengguna hanya melihat menu sesuai perannya. Tabel berikut memuat daftar halaman beserta kebutuhan fungsional yang terkait, diikuti wireframe dan penjelasan setiap halaman.

**Tabel 22. Daftar Halaman / Layar**

| **ID UI** | **Nama Halaman** | **Pengguna** | **Kebutuhan Terkait** |
| --- | --- | --- | --- |
| UI-01 | Landing Page | Semua | FR-09 |
| UI-02 | Login | Semua | FR-01 |
| UI-03 | Register | Mahasiswa | FR-01, FR-16 |
| UI-04 | Lupa Password | Semua | FR-01 |
| UI-05 | Dashboard Mahasiswa | Mahasiswa | FR-10. FR-16 |
| UI-06 | Pengajuan Surat Rekomendasi | Mahasiswa | FR-01, FR-03, FR-17 |
| UI-07 | Detail dan Status Pengajuan Rekomendasi | Mahasiswa | FR-05, FR-10, FR-17 |
| UI-08 | Penerimaan dan Pengajuan Konversi SKS | Mahasiswa | FR-06, FR-10 |
| UI-09 | Dokumen Hasil Konversi SKS | Mahasiswa | FR-08, FR-17 |
| UI-10 | Dokumen Magang | Mahasiswa | FR-12, FR-13 |
| UI-11 | Dashboard Admin Prodi | Admin Prodi | FR-04 |
| UI-12 | Verifikasi Surat Rekomendasi | Admin Prodi | FR-03, FR-04, FR-05 |
| UI-13 | Verifikasi Berkas Konversi SKS | Admin Prodi | FR-06 |
| UI-14 | Penentuan Hasil Konversi SKS | Admin Prodi | FR-07, FR-08 |
| UI-15 | Penetapan Dosen Pendamping | Admin Prodi | FR-11 |
| UI-16 | Pengaturan Periode Magang | Admin Prodi | FR-09 |
| UI-17 | Dashboard Dosen Pendamping | Dosen Pendamping | FR-11, FR-14 |
| UI-18 | Monitoring Magang Mahasiswa | Dosen Pendamping | FR-14 |
| UI-19 | Review dan Tanda Tangan Laporan Akhir | Dosen Pendamping | FR-13, FR-14, FR-15 |

| _![](images/image-008.png)_ |
| --- |

**Gambar 7. Mockup UI-01**

Landing Page terdapat pada gambar 7 merupakan halaman awal SIGMA UG yang menampilkan informasi umum mengenai sistem, tujuan layanan, serta tahapan proses pengajuan magang. Halaman ini juga menyediakan navigasi bagi pengguna untuk masuk atau melakukan registrasi ke dalam sistem.

| _![](images/image-009.png)_ |
| --- |

**Gambar 8. Mockup UI-02**

Pada gambar 8 halaman Login digunakan oleh seluruh pengguna untuk masuk ke dalam sistem SIGMA UG dengan memasukkan email dan password yang telah terdaftar. Sistem akan mengarahkan pengguna ke halaman dashboard sesuai dengan hak akses masing-masing.

| _![](images/image-010.png)_ |
| --- |

**Gambar 9. Mockup UI-03**

Gambar 9 merupakan halaman Register yang digunakan oleh mahasiswa untuk membuat akun baru dengan mengisi data diri dan informasi akademik yang diperlukan. Setelah proses registrasi berhasil, mahasiswa dapat menggunakan akun tersebut untuk mengakses layanan SIGMA UG.

| _![](images/image-011.png)_ |
| --- |

**Gambar 10. Mockup UI-04**

Gambar 10 halaman Lupa Password digunakan oleh pengguna yang mengalami kendala saat mengakses akun karena lupa kata sandi. Pengguna dapat memasukkan alamat email yang terdaftar untuk menerima instruksi pengaturan ulang password.

| _![](images/image-012.png)_ |
| --- |

**Gambar 11. Mockup UI-05**

Gambar 11 dashboard Mahasiswa merupakan halaman utama yang menampilkan ringkasan informasi pengajuan magang, status surat rekomendasi, batas maksimal magang, dosen pendamping, serta jumlah SKS yang dikonversi.

| ![](images/image-013.png) |
| --- |

**Gambar 12.Mockup UI-06**

Halaman Pengajuan Surat Rekomendasi pada gambar 12 digunakan mahasiswa untuk mengajukan permohonan surat rekomendasi magang dengan mengisi informasi perusahaan tujuan, data pendukung, serta mengunggah dokumen persyaratan yang dibutuhkan. Data pengajuan selanjutnya akan diteruskan kepada Admin Prodi untuk dilakukan pemeriksaan dan verifikasi.

| _![](images/image-014.png)_ |
| --- |

**Gambar 13.Mockup UI-07**

Gambar 13 menampilkan informasi detail pengajuan surat rekomendasi yang telah dikirimkan mahasiswa, termasuk data perusahaan tujuan, dokumen persyaratan, dan status pemeriksaan oleh Admin Prodi. Mahasiswa juga dapat mengetahui hasil pengajuan serta mengunduh surat rekomendasi apabila telah disetujui dan diterbitkan.

![](images/image-015.png)**Gambar 14.Mockup UI-08**

Gambar 14 digunakan mahasiswa yang telah diterima oleh perusahaan untuk mengajukan konversi SKS. Mahasiswa dapat mengunggah surat penerimaan magang dari perusahaan dan silabus yang telah dilengkapi sebagai dokumen persyaratan untuk diperiksa dan diproses oleh pihak program studi.

![](images/image-016.png)**Gambar 15.Mockup UI-09**

Gambar 15 menampilkan hasil proses konversi SKS yang telah disetujui oleh Admin. Mahasiswa dapat melihat informasi mata kuliah yang dikonversi beserta jumlah SKS dan mengunduh surat hasil konversi SKS yang telah diterbitkan oleh sistem.

![](images/image-017.png)**Gambar 16.Mockup UI-10**

Gambar 16 menampilkan halaman Dokumen Magang yang digunakan mahasiswa untuk mengisi atau mengunggah logbook kegiatan magang, laporan akhir, sertifikat, dan nilai akhir dari mitra sebagai persyaratan penyelesaian kegiatan magang.

![](images/image-018.png)**Gambar 17.Mockup UI-11**

Gambar 17 menampilkan halaman Dashboard Admin Prodi yang menyajikan ringkasan jumlah pengajuan surat rekomendasi, pengajuan konversi SKS, serta status pengajuan mahasiswa untuk membantu admin dalam memantau proses administrasi magang.

![](images/image-019.png)**Gambar 18.Mockup UI-12**

Gambar 18 menampilkan halaman Verifikasi Surat Rekomendasi yang digunakan Admin Prodi untuk memeriksa data mahasiswa, persyaratan akademik, dan dokumen pendukung sebelum menyetujui atau menolak pengajuan surat rekomendasi magang.

![](images/image-020.png)**Gambar 19.Mockup UI-13**

Gambar 19 menampilkan halaman Verifikasi Berkas Konversi SKS yang digunakan Admin Prodi untuk memeriksa kelengkapan surat penerimaan perusahaan dan silabus yang telah diunggah mahasiswa sebelum proses konversi SKS dilakukan.

**![](images/image-021.png)Gambar 20.Mockup UI-14**

Gambar 20 menampilkan halaman Penentuan Hasil Konversi SKS yang digunakan Admin Prodi untuk menentukan mata kuliah beserta jumlah SKS yang dapat dikonversi berdasarkan hasil pemeriksaan dokumen mahasiswa.

**![](images/image-022.png)Gambar 21.Mockup UI-15**

Gambar 21 menampilkan halaman Penetapan Dosen Pendamping yang digunakan Admin Prodi untuk memilih dan menetapkan dosen pendamping bagi mahasiswa yang pengajuan konversi SKS-nya telah disetujui.

**![](images/image-023.png)Gambar 22.Mockup UI-16**

Gambar 22 menampilkan halaman Pengaturan Periode Magang yang digunakan Admin Prodi untuk mengatur dan memperbarui jadwal kegiatan magang, mulai dari pembukaan pengajuan surat rekomendasi hingga batas pengumpulan laporan akhir dan sertifikat.

**![](images/image-024.png)Gambar 23.Mockup UI-17**

Gambar 23 menampilkan halaman Dashboard Dosen Pendamping yang menyajikan ringkasan jumlah mahasiswa bimbingan, informasi kegiatan magang, serta status perkembangan dokumen mahasiswa.

**![](images/image-025.png)Gambar 24.Mockup UI-18**

Gambar 24 menampilkan halaman Monitoring Magang Mahasiswa yang digunakan dosen pendamping untuk melihat daftar mahasiswa bimbingan dan memantau perkembangan kegiatan magang melalui logbook, laporan akhir, sertifikat, serta nilai akhir dari mitra.

**![](images/image-026.png)Gambar 25.Mockup UI-19**

Gambar 25 menampilkan halaman Review dan Tanda Tangan Laporan Akhir yang digunakan dosen pendamping untuk memeriksa laporan akhir mahasiswa, memberikan persetujuan, serta membubuhkan tanda tangan digital.

# **6\. Desain Pemodelan Matematis & Simulasi (jika ada)**

Tidak ada.

# **7\. Spesifikasi Teknis**

Tabel 21 menjelaskan spesifikasi teknis yang dibutuhkan untuk mendukung pengembangan dan pengoperasian sistem SIGMA UG. Spesifikasi tersebut mencakup kebutuhan perangkat keras server dan klien, sistem operasi, bahasa pemrograman dan framework, DBMS, serta tools pendukung yang digunakan. Spesifikasi ini menjadi acuan bagi tim pengembang dalam menyiapkan lingkungan pengembangan dan menjalankan sistem agar dapat berfungsi sesuai kebutuhan yang telah ditetapkan.

**Tabel 21. Spesifikasi Perangkat**

| **Jenis** | **Spesifikasi Minimum** | **Keterangan** |
| --- | --- | --- |
| Perangkat keras server | VPS Hostinger KVM 2: -   2 vCPU -   8 GB RAM -   100 GB NVMe -   traffic 8 TB/bulan -   jaringan 1 Gbps | Menampung Nginx, Node.js, PostgreSQL, dan berkas unggahan dalam satu server. Cukup untuk target 100 pengguna bersamaan (NFR-01). |
| Perangkat keras klien | Komputer/laptop RAM 8 GB atau ponsel Android/iOS, koneksi internet. | Tidak memerlukan perangkat khusus (NFR-05) |
| Sistem operasi | Server: Ubuntu Server LTS (VPS Hostinger). Pengembangan: Windows 11 | Klien bebas, cukup peramban modern (Chrome, Firefox, Edge) |
| Bahasa & framework | JavaScript; Node.js (Express.js) di sisi server, React.js di antarmuka | Aplikasi web, REST API (JSON) |
| DBMS | PostgreSQL | Backup mingguan dengan pg\_dump (NFR-04) |
| Tools pendukung | Visual Studio Code, Claude AI, Gemini AI | IDE dan asisten AI untuk pengkodean, dokumentasi, dan peninjauan |

# **8\. Keterlacakan Kebutuhan (Traceability)**

Tabel 22 menunjukkan keterkaitan antara setiap kebutuhan fungsional (FR-01 sampai FR-17) dengan use case, komponen atau modul sistem, halaman antarmuka (UI), serta tabel basis data yang mendukungnya. Matriks ini digunakan untuk memastikan bahwa setiap kebutuhan yang telah ditetapkan dalam dokumen SRS sudah memiliki rancangan dan bagian pendukung dalam SDD. Dengan adanya matriks keterlacakan ini, tim pengembang dapat lebih mudah memeriksa kesesuaian antara kebutuhan pengguna dengan rancangan sistem, sekaligus membantu proses pengembangan, pengujian, dan pemeliharaan sistem SIGMA UG.

**Tabel 23. Matriks Keterlacakan**

| **ID Kebutuhan** | **Use Case** | **Komponen / Modul** | **ID UI** | **Tabel Basis Data** |
| --- | --- | --- | --- | --- |
| FR-01 | UC-01 | Autentikasi dan Hak Akses; Google Account (OAuth 2.0) | UI-02 | users, admin, mahasiswa, dosen |
| FR-02 | UC-06 | Modul 2 Pengajuan Surat Rekomendasi | UI-06 | pengajuan\_rekomendasi, kategori\_perusahaan, periode\_magang |
| FR-03 | UC-07, UC-08 | Modul 3 Validasi Syarat | UI - 12 | mahasiswa, riwayat\_magang, kategori\_perusahaan, pengajuan\_rekomendasi |
| FR-04 | UC-07 | Modul 4 Dashboard Rekap | UI-11, UI-12 | pengajuan\_rekomendasi, riwayat\_status |
| FR-05 | UC-09 | Modul 5 Penerbitan Surat Rekomendasi; Pembuat PDF Surat; Templat Surat | UI-07, UI-12 | surat, template\_surat, pengajuan\_rekomendasi |
| FR-06 | UC-11, UC-12, UC-13 | Modul 6 Unggah Berkas Konversi; Pengelola Berkas | UI-08, UI-13 | penerimaan\_magang, pengajuan\_konversi, riwayat\_magang |
| FR-07 | UC-14 | Modul 7 Konversi SKS | UI-14 | pengajuan\_konversi, detail\_konversi, mata\_kuliah |
| FR-08 | UC-15 | Modul 8 Penerbitan Surat Konversi; Pembuat PDF Surat; Templat Surat | UI-09, UI-14 | surat, template\_surat, pengajuan\_konversi, detail\_konversi |
| FR-09 | UC-04, UC-05 | Modul 1 Informasi Periode Magang | UI-01, UI-16 | periode\_magang |
| FR-10 | UC-11, UC-21 | Backend API\*; Frontend (dashboard mahasiswa) | UI-05, UI-07, UI-08 | riwayat\_status, pengajuan\_rekomendasi, pengajuan\_konversi |
| FR-11 | UC-16 | Backend API\*; Modul 9 Monitoring Magang (daftar mahasiswa bimbingan) | UI-15, UI-17 | penugasan\_dosen, dosen, pengajuan\_konversi |
| FR-12 | UC-17 | Pengelola Berkas; Backend API\* | UI-10 | dokumen\_akhir (jenis\_dokumen = logbook) |
| FR-13 | UC-18 | Pengelola Berkas; Backend API\* | UI-10, UI-19 | dokumen\_akhir, penerimaan\_magang, periode\_magang (batas\_laporan) |
| FR-14 | UC-19 | Modul 9 Monitoring Magang | UI-17, UI-18, UI-19 | dokumen\_akhir, penugasan\_dosen, dosen |
| FR-15 | UC-20 | Modul 9 Monitoring Magang; Pengelola Berkas | UI-19 | dokumen\_akhir (ttd\_digital) |
| FR-16 | UC-02, UC-03 | Frontend (form data diri); Backend API\* | UI-03, UI-05, UI-12 | mahasiswa, riwayat\_magang |
| FR-17 | UC-06, UC-09, UC-15, UC-10 | Layanan Notifikasi Email (SMTP) | UI-06, UI-07, UI-09 | notifikasi\_email, users |
