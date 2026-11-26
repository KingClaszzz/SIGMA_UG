# SIGMA UG

**Sistem Informasi Gerbang Magang Akademik Universitas Gunadarma** adalah aplikasi web untuk mengelola administrasi magang Program Studi Sistem Informasi secara terpusat—mulai dari informasi periode, pengajuan dan penerbitan surat rekomendasi, pelaporan magang mandiri maupun pengajuan konversi SKS, penetapan dosen pendamping, hingga pengumpulan dokumen akhir dan pengesahan laporan.

---

## Ringkasan Fitur per Peran

| Peran | Fitur Utama |
|---|---|
| **Publik** | Landing page program magang, jadwal & ketentuan periode aktif, daftar kategori mitra yang diizinkan, FAQ, dan cek ketersediaan NPM saat pendaftaran. |
| **Mahasiswa** | Registrasi 2 langkah / login Email & Google OAuth, profil & riwayat magang (diverifikasi Admin Prodi), pengajuan & unduh PDF surat rekomendasi otomatis, pelaporan magang mandiri **tanpa konversi SKS** atau pengajuan **konversi SKS** (unggah surat penerimaan & silabus), serta pengumpulan & pemantauan dokumen akhir (laporan akhir, nilai mitra, sertifikat, logbook opsional). |
| **Admin Prodi** | Dashboard rekap, manajemen periode & jadwal magang (draft/dipublikasikan), validasi satuan & massal surat rekomendasi (pratinjau PDF, ubah nomor/TTD, terbit ulang), pemeriksaan & pemetaan mata kuliah konversi SKS, penugasan dosen pendamping, monitoring magang & riwayat magang mahasiswa (konversi & mandiri), manajemen akun dosen/mahasiswa (+ lepas NPM), profil & master data (**Mata Kuliah**, **Kategori Perusahaan**, **Template Surat**), serta pantau/kirim ulang log **Notifikasi Email**. |
| **Dosen Pendamping** | Dashboard aktivitas, daftar & detail mahasiswa bimbingan, pemeriksaan dokumen akhir (setujui atau minta perbaikan dengan catatan & batas revisi), pengesahan laporan akhir secara digital (SHA-256) atau unggah PDF bertanda tangan, riwayat monitoring, serta profil. |

---

## Arsitektur & Teknologi

- **Frontend (`client/`)**: React 18, Vite 5, React Router 6 (tampilan responsif desktop & mobile drawer).
- **Backend (`server/`)**: Node.js, Express 5, REST API JSON + unggah/unduh PDF.
- **Database & Autentikasi**: PostgreSQL (`pg`) dengan skema di [server/db/schema.sql](server/db/schema.sql), Supabase Auth (Email/Password & Google OAuth 2.0), dan Supabase Storage privat (`sigma-berkas`).
- **Dokumen & Email**: `pdfkit` & `pdf-lib` untuk generate surat resmi dan stempel tanda tangan digital; `nodemailer` untuk notifikasi email SMTP.
- **Pengujian Otomatis**: `node --test` bersama `@electric-sql/pglite` (PostgreSQL in-process tanpa menyentuh Supabase produksi).

---

## Struktur Proyek

```text
SIGMA_UG/
├── client/                  # Aplikasi React (Vite)
│   ├── src/
│   │   ├── admin/           # Halaman peran Admin Prodi
│   │   ├── auth/            # Masuk, daftar, lupa/atur ulang kata sandi, sesi
│   │   ├── components/      # Kerangka, dialog, tabel/unggah berkas, notifikasi
│   │   ├── dosen/           # Halaman peran Dosen Pendamping
│   │   ├── mahasiswa/       # Halaman peran Mahasiswa & tour panduan
│   │   └── pages/           # Landing page publik
│   └── .env.example
├── server/                  # REST API Express
│   ├── db/schema.sql        # Skema 20 tabel PostgreSQL + kebijakan RLS
│   ├── routes/              # publik.js, mahasiswa.js, admin.js, dosen.js
│   ├── scripts/             # siapkan-db.js & buat-akun.js
│   ├── templates/           # Templat surat (*.txt), logo, TTD, Form_Magang_Mitra_2026.docx
│   ├── test/                # Pengujian otomatis (PGlite)
│   ├── app.js               # Konfigurasi middleware, auth, rate limit, & router
│   ├── email.js             # Layanan pengirim SMTP & log notifikasi_email
│   ├── rules.js             # Aturan bisnis & validator masukan
│   ├── surat.js             # Mesin pembuat PDF dari templat *.txt
│   ├── ttd.js               # Pembubuhan blok tanda tangan digital + sidik SHA-256
│   └── .env.example
├── docs/                    # SRS, SDD, ERD, dan berkas acuan templat prodi
├── package.json             # Skrip monorepo tingkat atas
└── vercel.json              # Konfigurasi layanan deploy Vercel (client + server)
```

---

## Menjalankan di Lokal

### 1. Prasyarat
- **Node.js** versi terbaru yang mendukung `--env-file` (disarankan Node.js >= 20.12 / 22 LTS) dan **npm**
- Satu project **Supabase** (Database PostgreSQL, Authentication, dan Storage)

### 2. Instalasi Dependensi
Dari root repositori:

```bash
npm run install:all
```

### 3. Konfigurasi Environment Variable

**a. Server (`server/.env`)** — salin dari [server/.env.example](server/.env.example):

```env
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_BUCKET=sigma-berkas
PORT=3001

# Opsional: Notifikasi Email SMTP (jika kosong, email dicatat gagal dan dapat dikirim ulang Admin)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="SIGMA UG <no-reply@gunadarma.ac.id>"
APP_URL=http://localhost:5173
```

**b. Klien (`client/.env`)** — salin dari [client/.env.example](client/.env.example):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

### 4. Konfigurasi Supabase
1. **Authentication → Providers**: aktifkan **Email** (dan aktifkan **Google** jika ingin memakai tombol *Masuk dengan Google*).
2. **Authentication → URL Configuration**: atur **Site URL** ke `http://localhost:5173` dan tambahkan `http://localhost:5173/**` ke **Redirect URLs**.
3. **Storage**: bucket `sigma-berkas` akan dibuat otomatis pada langkah berikutnya. Jika Admin Prodi ingin mengunggah **template surat kustom (`.txt`)** lewat menu Admin, pastikan bucket `sigma-berkas` mengizinkan MIME `text/plain` selain `application/pdf`.

### 5. Inisialisasi Database & Akun Awal
Jalankan migrasi skema dan pembuatan bucket Storage dari root proyek:

```bash
npm run db:siapkan
```

Akun **Admin Prodi** dan **Dosen Pendamping** tidak mendaftar lewat form publik ([buat-akun.js](server/scripts/buat-akun.js)). Jalankan dari folder `server/`:

```bash
# Buat akun Admin Prodi
node --env-file=.env scripts/buat-akun.js admin admin@kampus.ac.id "Nama Admin" PASSWORD123 198001 "CP Magang" 081234567890

# Buat akun Dosen Pendamping (selanjutnya dosen juga bisa dibuat lewat menu Manajemen Akun di web Admin)
node --env-file=.env scripts/buat-akun.js dosen dosen@kampus.ac.id "Nama Dosen" PASSWORD123 0312088501 081234567891
```

### 6. Menjalankan Server & Klien

Buka dua terminal terpisah di root proyek:

```bash
# Terminal 1 — Backend API (http://localhost:3001)
npm run dev:server

# Terminal 2 — Frontend Vite (http://localhost:5173)
npm run dev:client
```

Untuk build produksi klien:

```bash
npm run build --prefix client
```

---

## Pengujian

Jalankan seluruh pengujian otomatis backend (menggunakan database PostgreSQL in-process `@electric-sql/pglite`, aman dijalankan kapan saja tanpa menyentuh Supabase):

```bash
npm test
```

---

## Keamanan & Catatan Produksi

- **Kontrol Akses & RLS**: `SUPABASE_SERVICE_ROLE_KEY` hanya boleh ada di `server/.env`. Seluruh 20 tabel diaktifkan **Row Level Security (RLS)** tanpa kebijakan publik, sehingga hanya backend yang membaca/menulis data; peran pengguna dibaca dari tabel `users`, bukan klaim klien.
- **Anti-Spam & Batas Laju**:
  - Maksimal **3 kali** pengiriman/pengiriman ulang surat rekomendasi maupun konversi SKS per mahasiswa dalam 7 hari (termasuk pengajuan yang ditolak).
  - Rate limiting ([server/batas.js](server/batas.js)): 600 permintaan/menit per IP, 90 aksi tulis/10 menit untuk mahasiswa (5× lebih longgar untuk admin dan dosen), serta pemblokiran sementara setelah 60 token tidak valid/5 menit per IP. *(Catatan: pembatas tersimpan di memori satu proses; gunakan Redis bila menjalankan banyak instance/serverless).*
- **Validasi Berkas & Header Keamanan**: Unggahan dokumen dibatasi PDF asli (`%PDF-`) maks. 2 MB; header keamanan terpasang (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP API, `Cache-Control: no-store`, dan HSTS saat `NODE_ENV=production`). Sesi klien otomatis keluar setelah 30 menit tanpa aktivitas.
- **Sebelum Publikasi**:
  1. Ganti templat aset contoh (`server/templates/ttd-kaprodi.png`) dengan tanda tangan resmi Ketua Prodi dan letakkan `Template_Laporan_Akhir.docx` di `server/templates/` jika sudah tersedia dari Prodi.
  2. Bersihkan data/akun uji (`*.test`), atur `NODE_ENV=production` serta `TRUST_PROXY` sesuai jumlah proxy, dan rotasi kunci rahasia apabila pernah dibagikan.
