# SIGMA_UG
## Menjalankan (pengembangan)

Butuh project Supabase (gratis cukup). Langkah sekali jalan:

1. Salin `server/.env.example` → `server/.env` dan `client/.env.example` → `client/.env`, isi nilainya dari dashboard Supabase.
2. Di Supabase: Authentication → Providers → aktifkan Email (dan Google bila perlu); Authentication → URL Configuration → isi Site URL `http://localhost:5173` dan tambahkan `http://localhost:5173/**` ke Redirect URLs.
3. Jalankan:

```
npm run install:all
npm run db:siapkan   # membuat tabel (db/schema.sql) dan bucket penyimpanan privat
npm run dev:server   # API di http://localhost:3001
npm run dev:client   # web di http://localhost:5173
npm test             # tes server (PostgreSQL dalam proses, tanpa Supabase)
```

Keamanan: `SUPABASE_SERVICE_ROLE_KEY` hanya di `server/.env`. Semua tabel memakai RLS tanpa kebijakan, jadi hanya server yang bisa membaca/menulis.
Surat PDF terbit saat admin menyetujui pengajuan. Form Isian Magang (template kosong untuk mahasiswa) ada di `server/templates/Form_Magang_Mitra_2026.docx`.

## Struktur per peran

Dokumen acuan ada di `docs/`. Setiap peran punya folder sendiri supaya tidak tercampur:

| Peran | Server | Klien | Status |
|---|---|---|---|
| Publik (landing, periode) | `server/routes/publik.js` | `client/src/pages/` | selesai |
| Mahasiswa | `server/routes/mahasiswa.js` | `client/src/mahasiswa/` | selesai |
| Admin Prodi | `server/routes/admin.js` | `client/src/admin/` | selesai |
| Dosen Pendamping | `server/routes/dosen.js` | `client/src/dosen/` | selesai (pengesahan laporan: blok digital internal, bukan e-sign tersertifikasi) |

Komponen yang dipakai semua peran ada di `client/src/components/`. Daftar pekerjaan yang tersisa ada di `Progress.md`.

## Akun Admin Prodi dan Dosen

Akun admin dan dosen dibuat tim pengembang (bukan mendaftar sendiri). Dari folder `server`:

```
node --env-file=.env scripts/buat-akun.js admin email@kampus.ac.id "Nama Lengkap" PASSWORD NIP "Jabatan" 08xxxxxxxxxx
node --env-file=.env scripts/buat-akun.js dosen email@kampus.ac.id "Nama Lengkap" PASSWORD NIDN 08xxxxxxxxxx
```

Setelah masuk, admin mengatur periode di Informasi Periode, menambah mata kuliah lewat tombol Kelola di halaman Pemetaan Mata Kuliah, dan membuat akun dosen di Manajemen Akun (tidak perlu skrip).
Templat surat ada di `server/templates/*.txt` (format dijelaskan di komentar `server/surat.js`).

## Keamanan dan anti-spam

- **Batas kirim pengajuan:** tiap mahasiswa maksimal 3 kali mengirim (atau mengirim ulang) surat rekomendasi dan 3 kali konversi SKS per 7 hari, termasuk yang ditolak (`BATAS_KIRIM_MINGGUAN` di `server/rules.js`).
- **Batas laju (`server/batas.js`):** 600 permintaan/menit per IP, 90 tindakan tulis/10 menit per pengguna (admin dan dosen 5× lebih longgar), dan 60 token salah/5 menit per IP. Hitungan ada di memori satu proses; jika server dijalankan lebih dari satu salinan, pindahkan ke Redis.
- **Header keamanan** (nosniff, frame DENY, CSP, no-store, HSTS bila `NODE_ENV=production`), body JSON maks 100 KB, unggahan hanya PDF asli (cek tanda `%PDF-`) maks 2 MB, semua query SQL berparameter, dan galat basis data tidak dibocorkan ke klien.
- **Produksi di belakang proxy/hosting:** isi `TRUST_PROXY` (jumlah proxy, mis. `1`) di `server/.env` agar batas per IP memakai IP pengunjung, dan jalankan lewat HTTPS.
- Kunci rahasia Supabase dan kata sandi database yang pernah tertulis di chat sebaiknya diganti sebelum publikasi.
