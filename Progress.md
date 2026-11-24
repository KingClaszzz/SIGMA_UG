# Progress SIGMA UG

Terakhir diperbarui: 22 November 2026. Isinya: (A) laporan singkat yang sudah jadi, (B) perubahan database di luar SDD, (C) daftar tugas buat Judi.

---

## A. Yang sudah jadi

**Umum**
- Landing page (hero maskot beranimasi, alert kalau belum ada pengumuman periode), login, daftar dua langkah, lupa/atur ulang password.
- Tiga peran, semuanya jalan ke Supabase asli: Mahasiswa, Admin Prodi, Dosen Pendamping. Peran dibaca dari tabel `users`, bukan dari token.
- Logout otomatis setelah 30 menit tidak aktif (NFR-02), pemberitahuan mengambang di tengah layar, dan panduan (tour) buat mahasiswa baru.

**Mahasiswa**
- Data diri (diverifikasi admin), riwayat magang (opsional), ubah password.
- Surat rekomendasi: draft → unggah 3 dokumen wajib → kirim → unduh surat PDF setelah disetujui.
- Konversi SKS: unduh Form Isian Magang, unggah surat penerimaan dan silabus, kirim, lihat hasil pemetaan, unduh surat konversi.
- Dokumen magang: laporan akhir, nilai mitra, sertifikat, logbook (opsional, PDF maks 2 MB). Lihat catatan dosen, batas revisi, dan unduh laporan yang sudah ditandatangani.

**Maskot**
- Maskot lama (kena hak cipta) dihapus total, diganti burung hantu SIGMA dari gambar yang dikasih (3 pose: jas di hero dan sidebar dosen, laptop di banner footer dan sidebar mahasiswa, papan di sidebar admin). Aset: `client/src/assets/owl-*.webp`, komponen: `client/src/components/Maskot.jsx` + `maskot.css`.
- Gambar tidak dipotong-potong lagi (satu gambar utuh, jadi tidak ada garis sambungan). Gerak: bernapas pelan, mata berkedip acak, kepala condong ngikutin kursor, goyang pas di-hover, klik = lompat/joget/salto/putar + mata gembira + gelembung ucapan + percikan partikel di hero.
- Sidebar: maskot mengisi ruang kosong di bawah menu, ukurannya menyesuaikan tinggi layar, hilang di layar HP.
- Mata berkedip memakai kelopak SVG berwarna kulit wajah di atas gambar (posisi mata di `assets/index.js`). Kalau ganti gambar maskot, hitung ulang posisi mata dan `warna`-nya.
- Mata tidak ikut menoleh ke kursor (pupil menyatu di gambar); yang ikut kursor kepala/badan.

**Perbaikan role Mahasiswa (cek ulang ke PNG Figma)**
- Profil: tampilan ringkas seperti desain (kartu identitas, Data Mahasiswa, Pengaturan Akun + Ubah Password). Tombol "Edit Profil" membuka formulir data diri yang sudah ada. Riwayat magang tetap opsional.
- Lonceng notifikasi mahasiswa (surat terbit/ditolak/minta perbaikan, konversi, dokumen diperiksa, laporan ditandatangani, dosen ditetapkan, pengingat tenggat).
- Surat rekomendasi: kolom Alamat di Data Mahasiswa, timeline 4 langkah, tombol unduh/status di kartu Status Pengajuan, banner dan label "Perlu Perbaikan" kalau admin minta perbaikan.
- Konversi SKS: timeline 3 langkah, riwayat ada Tgl Persetujuan + Unduh Surat, hasil konversi ada kolom Semester, tombol "Lihat Hasil Konversi" dan "Lihat Riwayat".
- Dokumen Magang: logbook hanya unggah PDF opsional (maks 2 MB); tab Laporan Akhir ada Status Tanda Tangan + tombol template; tab Monitoring ada kolom Pemeriksa dan Tanggal.

**Admin Prodi** (ngikut PNG Figma)
- Dashboard, lonceng notifikasi, Informasi Periode (draft/publikasi, Aktif/Draft/Selesai), Pengajuan Surat Rekomendasi (setujui = surat langsung terbit, minta perbaikan, tolak, validasi massal), Penerimaan Konversi SKS (periksa, pemetaan mata kuliah, setujui = surat konversi terbit), Penugasan Dosen, Monitoring Magang, Manajemen Akun (buat/aktifkan/nonaktifkan akun dosen, verifikasi data mahasiswa).

**Dosen Pendamping** (ngikut PNG Figma)
- Dashboard, lonceng notifikasi, Mahasiswa Bimbingan (daftar + detail), Monitoring Magang per jenis dokumen (setujui, minta perbaikan + batas revisi, "menunggu pemeriksaan ulang"), Riwayat Monitoring, pengesahan laporan akhir secara digital atau unggah PDF bertanda tangan, profil + ubah password.

**Surat PDF**
- Surat konversi dan surat rekomendasi di-generate dari data asli (nama, NPM, angkatan dari NPM, perusahaan, tabel mata kuliah dari input admin), ngikut template di `docs/template`. Teks surat ada di `server/templates/*.txt`, kodenya `server/surat.js`.
- Form Isian Magang (`Form_Magang_Mitra_2026.docx`) cuma template kosong yang diunduh mahasiswa.

**Keamanan dan anti-spam**
- Maks 3x kirim (atau kirim ulang) surat rekomendasi dan 3x konversi per mahasiswa per 7 hari, termasuk yang ditolak.
- Rate limit per IP dan per pengguna, blokir sementara token salah berulang, header keamanan, body JSON dibatasi, unggahan PDF asli maks 2 MB, semua SQL berparameter. Detail ada di README.

**Pengujian**
- `npm test` di server: 26 tes lolos (PGlite, tanpa Supabase).
- Alur lengkap 3 peran sudah dites ke Supabase asli lewat skrip API (41 pengecekan lolos). Tampilan dicek di browser untuk login, daftar, dashboard tiga peran, dan sebagian halaman admin/dosen.

**Tambahan di luar Figma**
- Animasi/hover di login, tour mahasiswa, notifikasi mengambang tengah, validasi massal surat rekomendasi, riwayat magang opsional, batas kirim mingguan.

---

## B. Perubahan database di luar SDD

File sumbernya `server/db/schema.sql` (aman dijalankan ulang: `npm run db:siapkan`). Semua tabel pakai RLS tanpa kebijakan, jadi hanya server yang bisa baca/tulis. Semua waktu memakai `TIMESTAMPTZ` (SDD: `TIMESTAMP`) supaya zona waktu tidak bergeser.

### Tabel baru

**`dokumen_pengajuan`** — dokumen syarat surat rekomendasi

| Kolom | Tipe | Keterangan |
|---|---|---|
| id_dokumen | SERIAL | PK |
| id_pengajuan | INTEGER | FK → pengajuan_rekomendasi, ON DELETE CASCADE |
| jenis_dokumen | VARCHAR(30) | `rangkuman_nilai`, `bukti_pembayaran`, `surat_izin_orang_tua`, `contoh_surat_perusahaan` |
| file_dokumen | VARCHAR(255) | lokasi di Supabase Storage |
| nama_asli | VARCHAR(120) | nama file asli |
| ukuran | INTEGER | byte |
| diunggah_pada | TIMESTAMPTZ | default `now()` |

UNIQUE (id_pengajuan, jenis_dokumen).

**`riwayat_dokumen`** — riwayat pengiriman dan pemeriksaan dokumen akhir

| Kolom | Tipe | Keterangan |
|---|---|---|
| id_riwayat | SERIAL | PK |
| id_dokumen | INTEGER | FK → dokumen_akhir, ON DELETE CASCADE |
| aksi | VARCHAR(20) | `diunggah`, `disetujui`, `perbaikan`, `ditandatangani` |
| oleh | INTEGER | FK → users, boleh kosong |
| catatan | TEXT | catatan dosen saat minta perbaikan |
| waktu | TIMESTAMPTZ | default `now()` |

### Kolom tambahan pada tabel SDD

| Tabel | Kolom | Tipe | Keterangan |
|---|---|---|---|
| users | auth_id | UUID, NOT NULL, UNIQUE | menaut ke Supabase Auth; `password_hash` dan `google_id` dihapus |
| mahasiswa | alamat | VARCHAR(200) | tercetak di surat rekomendasi; wajib diisi di form, kolomnya boleh kosong |
| mahasiswa | notif_dibaca_pada | TIMESTAMPTZ, default `now()` | lonceng notifikasi mahasiswa |
| admin | notif_dibaca_pada | TIMESTAMPTZ, default `now()` | "Tandai Semua Dibaca" |
| dosen | notif_dibaca_pada | TIMESTAMPTZ, default `now()` | sama |
| periode_magang | nama_periode | VARCHAR(100) | wajib diisi lewat form admin |
| periode_magang | semester | VARCHAR(6) | `Ganjil` atau `Genap` |
| periode_magang | deskripsi | TEXT | |
| periode_magang | status | VARCHAR(14), default `dipublikasikan` | CHECK `draft` / `dipublikasikan` |
| periode_magang | tgl_buka_konversi | DATE | kosong = sehari setelah `tgl_tutup` |
| periode_magang | tgl_buka_dokumen | DATE | |
| periode_magang | min_semester | SMALLINT, default 5 | ambang syarat |
| periode_magang | min_ipk | NUMERIC(3,2), default 3.00 | ambang syarat |
| pengajuan_rekomendasi | kepada | VARCHAR(100), NOT NULL | tujuan surat |
| pengajuan_rekomendasi | dibuat_pada | TIMESTAMPTZ, default `now()` | |
| penerimaan_magang | posisi | VARCHAR(100), NOT NULL | |
| penerimaan_magang | tgl_mulai, tgl_selesai | DATE, NOT NULL | |
| penerimaan_magang | nama_surat_penerimaan | VARCHAR(120) | |
| penerimaan_magang | ukuran_surat_penerimaan | INTEGER | byte |
| detail_konversi | keterangan | VARCHAR(200) | kolom Keterangan di lampiran surat; kosong = teks bawaan template |
| dokumen_akhir | file_dokumen, nama_asli, ukuran | NOT NULL | logbook opsional dan hanya berupa PDF, jadi selalu ada berkas |
| dokumen_akhir | status_periksa | VARCHAR(20) | diperluas: `menunggu`, `perlu_perbaikan`, `disetujui` |
| dokumen_akhir | pernah_perbaikan | BOOLEAN, default FALSE | TRUE = tampil "Menunggu Pemeriksaan Ulang" |
| dokumen_akhir | batas_revisi | DATE | opsional, diisi dosen |
| dokumen_akhir | file_ttd | VARCHAR(255) | laporan bertanda tangan (digital/unggahan dosen) |
| dokumen_akhir | nama_ttd | VARCHAR(120) | nama file laporan bertanda tangan |
| dokumen_akhir | ditandatangani_pada | TIMESTAMPTZ | |

**Dihapus:** tabel `logbook_entri` dan kolom `dokumen_akhir.ringkasan` (logbook sekarang cuma unggah PDF opsional). Migrasi ada di akhir `schema.sql` (`DROP TABLE`, `DROP COLUMN`, `SET NOT NULL`), jalan lewat `npm run db:siapkan`.

Indeks unik tambahan: `surat_nomor_unik` pada `surat(nomor_surat)`. Library baru di server: `pdf-lib` (tempel blok tanda tangan ke PDF).

---

## C. Buat Judi — next yang lu kerjain

Bro Judi, ini sisa kerjaan. Yang gua tulis "belum" itu beneran belum.

### 1. Login Google (tugas lu)
Tombol "Masuk dengan Google" udah ada di `client/src/auth/Auth.jsx` dan manggil `supabase.auth.signInWithOAuth`, tapi provider-nya belum dikonfigurasi jadi masih error kalau diklik.
1. Bikin OAuth Client ID di Google Cloud Console, isi redirect URI dari Supabase (Authentication → Providers → Google).
2. Aktifin provider Google di Supabase, tempel Client ID dan Secret.
3. Cek Site URL dan Redirect URLs (lokal `http://localhost:5173/**`, nanti tambah domain produksi).
4. Tes: login Google → `/arah` → `/profil` buat isi data diri. Data pendaftaran dua langkah cuma kebawa kalau daftar pakai email.
5. Putusin: dibatasin ke email kampus atau nggak? Kalau iya, batasin di server (`autentikasi` di `server/app.js`), jangan cuma di klien.

### 2. Email notifikasi (FR-17) — belum ada
- Pilih penyedia (Resend, Brevo, SMTP kampus). Kalau pakai Supabase, setel Custom SMTP biar email konfirmasi/reset nggak masuk spam. Template email Supabase masih bahasa Inggris, ganti di Authentication → Email Templates.
- Kirim dari server pas ada kejadian: `setujuiDanTerbitkan`, `tolak`, `perbaikan` di `server/routes/admin.js`, dan `periksa` di `server/routes/dosen.js`. Tabel `notifikasi_email` dari SDD udah ada tapi belum dipakai.
- Lonceng di dalam web udah ada buat admin, dosen, dan mahasiswa (`client/src/admin/Notifikasi.jsx`, prop `dasar`). Itu cuma notifikasi dalam aplikasi, email-nya belum.

### 3. Surat PDF — cek bareng prodi
Gua cuma ngecek teksnya, tampilan visualnya belum gua lihat. Buka PDF hasilnya, bandingin sama `docs/template/`, rapihin kalau ada yang geser (`server/surat.js`, `server/templates/*.txt`). Yang perlu keputusan:
- **Penandatangan surat rekomendasi:** template minta nama/jabatan/NIP/email/telepon yang merekomendasikan, sistem nggak punya data itu, jadi gua isi pakai data admin yang menyetujui. Kalau harusnya Ketua Prodi atau dosen lain, ganti sumbernya di `setujuiDanTerbitkan`.
- **Nama Ketua Prodi** (Dr. Naeli Umniati, S.T., M.M.S.I.) gua tulis di `surat-konversi.txt`.
- **Kelas** nggak ada di template, jadi nggak dibuat (konversi pakai Angkatan dari NPM). Kalau perlu, tambah kolom di profil.
- Kolom **Sem** di lampiran konversi pakai semester mahasiswa karena `mata_kuliah` belum punya semester.
- Nomor surat nggak dicetak di surat konversi (template nggak ada), tapi tersimpan di DB.
- Logo kop (`server/templates/logo-gunadarma.jpg`) kecil, minta file bagus ke prodi.
- **Tanda tangan digital laporan** itu pengesahan internal (blok + sidik jari SHA-256), bukan e-sign tersertifikasi. Kalau kampus butuh yang legal (BSrE/Tilaka), ganti isi `server/ttd.js`. Surat rekomendasi/konversi masih ditandatangani basah.

**Template laporan akhir belum ada.** Figma mahasiswa punya tombol "Unduh Template Laporan Akhir", tapi prodi belum ngasih filenya. Taruh di `server/templates/Template_Laporan_Akhir.docx`, tombolnya otomatis aktif (sekarang tampil "Belum disediakan prodi").

### 4. Data asli yang harus diisi (jangan dummy)
- **Mata kuliah:** admin isi lewat Pemetaan → Kelola. Sekarang kosong.
- **Kategori perusahaan:** ada 6 data awal dari SRS, cek daftar yang diizinkan sama prodi.
- **Periode magang:** admin buat di Informasi Periode.
- **Akun admin:** pakai `server/scripts/buat-akun.js` (lihat README). Dosen dibuat admin di Manajemen Akun.
- **Logo mitra di landing:** nggak gua tampilin karena butuh izin perusahaan.

### 5. Figma yang beda atau belum
- Logbook di Figma dosen kayak banyak entri (aktivitas/hasil/kendala/lampiran). Di sistem logbook itu satu berkas PDF opsional, jadi detailnya cuma nampilin itu. Progres dokumen ngitung 3 dokumen wajib, bukan 4.
- Tombol Google di Figma dosen "Login Staff Gunadarma dengan Google", di sini satu halaman login buat semua peran.
- Kolom desain admin yang dilewatin karena nggak ada di skema: Kelas, Pembimbing perusahaan, Kesesuaian, deskripsi pekerjaan.
- Tab "Perlu Perbaikan" di konversi (Figma) nggak ada statusnya, dipetakan ke tahap Pemetaan.
- Mahasiswa yang nggak ambil konversi belum punya alur. Halaman profil admin belum ada (Figma-nya juga nggak ada).

### 5b. Beda dari Figma di role mahasiswa
- **Lupa Password** di Figma pakai kode verifikasi ("Kirim Kode Verifikasi"), di sini pakai tautan reset lewat email (cara standar Supabase). Kalau mau kode OTP, pakai `supabase.auth.verifyOtp`.
- **Logbook** di Figma punya status per entri dan lampiran per entri. Di sini logbook cuma satu berkas PDF opsional (maks 2 MB), status di tingkat dokumen; entri harian dihapus.
- Timeline surat rekomendasi Figma punya langkah "Menunggu tanda tangan Kaprodi/Sekprodi". Karena admin setuju = surat langsung terbit, langkah 2 sampai 4 selesai barengan.
- Ringkasan konversi di dashboard dan kartu "Status Pengajuan Saat Ini" dipertahankan seperti sebelumnya (sudah sesuai).

### 6. Belum dites
- **Tampilan HP/layar kecil** belum dicek sama sekali, sapu semua halaman.
- Yang udah dicek di browser cuma login, daftar, dashboard tiga peran, dan sebagian halaman admin/dosen. Sisanya (surat rekomendasi, konversi, dokumen magang, tour, notifikasi tengah) baru dites lewat API dan build. Pernah ada layar kosong di Dokumen Magang yang lolos karena ini, jadi klik semua menu.

### 7. Sebelum dipublikasikan
- **Ganti semua rahasia:** service role key dan password database pernah kebuka di chat.
- **Hapus data uji** di Supabase: akun `admin@e2e.test`, `dosen@e2e.test`, `dosen2@e2e.test`, `mhs@e2e.test` (password `UjiE2E-12345`) beserta pengajuan dan berkasnya. Hapus akun di Authentication, kosongin tabel (kecuali `kategori_perusahaan`), dan kosongin bucket `sigma-berkas`.
- Deploy: build klien (`npm run build` di `client`) lalu layani lewat web server yang nge-proxy `/api` ke Express. Pakai HTTPS, set `NODE_ENV=production` dan `TRUST_PROXY` di `server/.env`.
- Rate limit ada di memori satu proses (`server/batas.js`). Kalau lebih dari satu instance, pindahin ke Redis.
- Atur rate limit login di Supabase (Authentication → Rate Limits), brute force login itu urusan Supabase.
- Backup database dan aturan berapa lama berkas disimpan (cek prodi). Log audit (siapa ngapain) kalau diminta, sekarang cuma ada riwayat status.

### 8. Rapihin kecil-kecil
- Daftar admin belum ada paginasi (kecuali Monitoring admin).
- Bundel JS klien sekitar 600 KB, bisa di-split pakai `React.lazy` per peran.
- `.env` jangan di-commit (udah di `.gitignore`).

## Sinkron dengan SDD v2 (terbaru)

Tabel dan kolom dicocokkan dengan `docs/Versi2_03_SDD.docx`. Dari 20 tabel, semuanya sama kecuali poin berikut.

- **Aturan:** kolom yang ada di SDD v2 dipertahankan, yang tidak ada dihapus.
- **Dihapus** (tidak ada di SDD, migrasi sudah jalan di Supabase): `mahasiswa.jumlah_sks`, `dokumen_akhir.pernah_perbaikan`, `dokumen_akhir.ukuran`, `penerimaan_magang.nama_surat_penerimaan` dan `ukuran_surat_penerimaan`, `pengajuan_konversi.nama_silabus` dan `ukuran_silabus`.
  - Status "Menunggu Pemeriksaan Ulang" sekarang dibaca dari `riwayat_dokumen` (aksi `perbaikan`), bukan dari kolom.
  - Nama berkas surat penerimaan dan silabus ditampilkan sebagai "Surat penerimaan.pdf" dan "Silabus.pdf".
- **Dipertahankan, beda dengan SDD:**
  - `dokumen_akhir.ringkasan` sudah dihapus sesuai keputusan logbook upload-only (SDD masih mencantumkannya).
  - `dokumen_akhir.file_dokumen` dan `nama_asli` sekarang Null, sesuai SDD.
- **NPM:** unik (sudah di skema). Saat daftar, NPM dicek lewat `GET /api/publik/npm/:npm`. Jika sudah dipakai akun lain, pendaftaran ditolak.
- **Lepas NPM (admin):** `POST /api/admin/mahasiswa/:id/lepas-npm` menghapus data diri mahasiswa dan menonaktifkan akunnya, supaya pemilik NPM bisa mendaftar ulang. Ditolak bila akun sudah punya pengajuan atau riwayat magang. Tidak ada tabel baru.
- **Semester:** dropdown 5, 6, atau 7 di pendaftaran dan profil. Server juga memvalidasi.
- **IPK:** input 0,00–4,00 sesuai SDD. Syarat minimal mengikuti `periode_magang.min_ipk` (default 3,00).
- **Format tanggal:** dd/mm/yyyy.
- **Logo Google:** logo resmi 4 warna.

Yang perlu diperbaiki di SDD v2 nanti: paragraf tabel users masih menyebut `password_hash` (bcrypt), padahal login memakai Supabase Auth (`auth_id`). Paragraf dokumen_akhir juga masih menyebut ringkasan.

Acuan aturan bisnis: `docs/` (Definisi, SRS, SDD). Peta folder dan cara jalanin: README.
