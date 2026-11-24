-- Skema SIGMA UG mengikuti SDD bab 4 (tabel 2–19). Aman dijalankan berulang (IF NOT EXISTS).
-- Perbedaan dari SDD, semuanya karena Supabase Auth dan kebutuhan UI:
--   users            : tanpa password_hash/google_id (diurus Supabase Auth), + auth_id yang menaut ke auth.users.
--   TIMESTAMP        : dipakai TIMESTAMPTZ agar zona waktu tidak bergeser.
--   pengajuan_rekomendasi: + kepada (UI-06), + dibuat_pada.
--   dokumen_pengajuan: tabel baru untuk dokumen syarat pengajuan (UI-06 tahap 2); SDD belum punya.
--   penerimaan_magang: + posisi, tgl_mulai, tgl_selesai, nama/ukuran berkas (UI-08).
--   dokumen_akhir    : status_periksa diperluas (menunggu | perlu_perbaikan | disetujui).
-- Semua tabel memakai RLS tanpa kebijakan: hanya server (koneksi langsung) yang boleh membaca/menulis.

CREATE TABLE IF NOT EXISTS users (
  id_user SERIAL PRIMARY KEY,
  auth_id UUID NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  nama VARCHAR(60) NOT NULL,
  peran VARCHAR(20) NOT NULL CHECK (peran IN ('mahasiswa', 'admin', 'dosen')),
  is_aktif BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin (
  id_admin SERIAL PRIMARY KEY,
  id_user INTEGER NOT NULL UNIQUE REFERENCES users (id_user),
  nip VARCHAR(20) NOT NULL UNIQUE,
  jabatan VARCHAR(50) NOT NULL,
  no_telepon VARCHAR(15) NOT NULL
);

CREATE TABLE IF NOT EXISTS dosen (
  id_dosen SERIAL PRIMARY KEY,
  id_user INTEGER NOT NULL UNIQUE REFERENCES users (id_user),
  nidn VARCHAR(20) NOT NULL UNIQUE,
  no_telepon VARCHAR(15) NOT NULL
);

CREATE TABLE IF NOT EXISTS mahasiswa (
  id_mahasiswa SERIAL PRIMARY KEY,
  id_user INTEGER NOT NULL UNIQUE REFERENCES users (id_user),
  npm VARCHAR(10) NOT NULL UNIQUE,
  ipk NUMERIC(3, 2) NOT NULL CHECK (ipk BETWEEN 0 AND 4),
  semester SMALLINT NOT NULL CHECK (semester >= 1),
  no_telepon VARCHAR(15) NOT NULL,
  status_aktif BOOLEAN NOT NULL,
  status_cuti BOOLEAN NOT NULL,
  ada_nilai_e BOOLEAN NOT NULL,
  status_verifikasi VARCHAR(20) NOT NULL DEFAULT 'menunggu' CHECK (status_verifikasi IN ('menunggu', 'terverifikasi', 'tidak_sesuai')),
  catatan_verifikasi TEXT,
  diverifikasi_oleh INTEGER REFERENCES admin (id_admin),
  diverifikasi_pada TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS periode_magang (
  id_periode SERIAL PRIMARY KEY,
  tahun_akademik VARCHAR(13) NOT NULL,
  gelombang SMALLINT NOT NULL CHECK (gelombang BETWEEN 1 AND 3),
  tgl_buka DATE NOT NULL,
  tgl_tutup DATE NOT NULL,
  tgl_pengumuman DATE,
  tgl_mulai_pelaksanaan DATE,
  tgl_selesai_pelaksanaan DATE,
  batas_konversi DATE,
  batas_laporan DATE,
  ketentuan TEXT,
  dibuat_oleh INTEGER REFERENCES admin (id_admin),
  CHECK (tgl_tutup >= tgl_buka)
);

-- Kolom tambahan periode (desain admin "Tambah Periode"): nama, deskripsi, draft/publikasi, jadwal konversi dan dokumen sendiri, ketentuan syarat.
ALTER TABLE periode_magang ADD COLUMN IF NOT EXISTS nama_periode VARCHAR(100);
ALTER TABLE periode_magang ADD COLUMN IF NOT EXISTS deskripsi TEXT;
ALTER TABLE periode_magang ADD COLUMN IF NOT EXISTS status VARCHAR(14) NOT NULL DEFAULT 'dipublikasikan';
ALTER TABLE periode_magang ADD COLUMN IF NOT EXISTS tgl_buka_konversi DATE;
ALTER TABLE periode_magang ADD COLUMN IF NOT EXISTS tgl_buka_dokumen DATE;
ALTER TABLE periode_magang ADD COLUMN IF NOT EXISTS min_semester SMALLINT NOT NULL DEFAULT 5;
ALTER TABLE periode_magang ADD COLUMN IF NOT EXISTS min_ipk NUMERIC(3, 2) NOT NULL DEFAULT 3.00;
DO $$ BEGIN
  ALTER TABLE periode_magang ADD CONSTRAINT periode_status_sah CHECK (status IN ('draft', 'dipublikasikan'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS kategori_perusahaan (
  id_kategori SERIAL PRIMARY KEY,
  nama_kategori VARCHAR(50) NOT NULL UNIQUE,
  is_diizinkan BOOLEAN NOT NULL
);

INSERT INTO kategori_perusahaan (nama_kategori, is_diizinkan) VALUES
  ('Kementerian / Instansi Pemerintah', TRUE),
  ('BUMN', TRUE),
  ('Program MAGENTA', TRUE),
  ('Perusahaan Terbuka (Tbk.)', TRUE),
  ('Swasta', FALSE)
ON CONFLICT (nama_kategori) DO NOTHING;

CREATE TABLE IF NOT EXISTS pengajuan_rekomendasi (
  id_pengajuan SERIAL PRIMARY KEY,
  id_mahasiswa INTEGER NOT NULL REFERENCES mahasiswa (id_mahasiswa),
  id_periode INTEGER REFERENCES periode_magang (id_periode),
  id_kategori INTEGER NOT NULL REFERENCES kategori_perusahaan (id_kategori),
  nama_perusahaan VARCHAR(150) NOT NULL,
  kepada VARCHAR(100) NOT NULL,
  alamat_perusahaan TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'diajukan', 'disetujui', 'ditolak', 'diterbitkan')),
  alasan_penolakan TEXT,
  divalidasi_oleh INTEGER REFERENCES admin (id_admin),
  divalidasi_pada TIMESTAMPTZ,
  tgl_mulai DATE,
  tgl_selesai DATE,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dokumen_pengajuan (
  id_dokumen SERIAL PRIMARY KEY,
  id_pengajuan INTEGER NOT NULL REFERENCES pengajuan_rekomendasi (id_pengajuan) ON DELETE CASCADE,
  jenis_dokumen VARCHAR(30) NOT NULL CHECK (jenis_dokumen IN ('rangkuman_nilai', 'bukti_pembayaran', 'surat_izin_orang_tua', 'contoh_surat_perusahaan')),
  file_dokumen VARCHAR(255) NOT NULL,
  nama_asli VARCHAR(120) NOT NULL,
  ukuran INTEGER NOT NULL,
  UNIQUE (id_pengajuan, jenis_dokumen)
);

CREATE TABLE IF NOT EXISTS penerimaan_magang (
  id_penerimaan SERIAL PRIMARY KEY,
  id_pengajuan INTEGER NOT NULL UNIQUE REFERENCES pengajuan_rekomendasi (id_pengajuan),
  posisi VARCHAR(100) NOT NULL,
  tgl_mulai DATE NOT NULL,
  tgl_selesai DATE NOT NULL,
  file_surat_penerimaan VARCHAR(255),
  pilih_konversi BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL CHECK (status IN ('draft', 'diterima_perusahaan', 'selesai'))
);

CREATE TABLE IF NOT EXISTS riwayat_magang (
  id_riwayat SERIAL PRIMARY KEY,
  id_mahasiswa INTEGER NOT NULL REFERENCES mahasiswa (id_mahasiswa),
  nama_perusahaan VARCHAR(150) NOT NULL,
  tahun SMALLINT NOT NULL,
  sumber VARCHAR(20) NOT NULL CHECK (sumber IN ('input_mahasiswa', 'sistem')),
  id_penerimaan INTEGER REFERENCES penerimaan_magang (id_penerimaan)
);

CREATE TABLE IF NOT EXISTS pengajuan_konversi (
  id_konversi SERIAL PRIMARY KEY,
  id_penerimaan INTEGER NOT NULL UNIQUE REFERENCES penerimaan_magang (id_penerimaan),
  file_silabus VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'diajukan', 'ditinjau', 'ditolak', 'diproses', 'diterbitkan', 'selesai')),
  alasan_penolakan TEXT,
  diperiksa_oleh INTEGER REFERENCES admin (id_admin),
  diperiksa_pada TIMESTAMPTZ,
  ditetapkan_oleh INTEGER REFERENCES admin (id_admin),
  ditetapkan_pada TIMESTAMPTZ,
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mata_kuliah (
  id_matkul SERIAL PRIMARY KEY,
  kode_mk VARCHAR(15) NOT NULL UNIQUE,
  nama_mk VARCHAR(50) NOT NULL,
  sks SMALLINT NOT NULL CHECK (sks BETWEEN 1 AND 6)
);

CREATE TABLE IF NOT EXISTS detail_konversi (
  id_detail SERIAL PRIMARY KEY,
  id_konversi INTEGER NOT NULL REFERENCES pengajuan_konversi (id_konversi) ON DELETE CASCADE,
  id_matkul INTEGER NOT NULL REFERENCES mata_kuliah (id_matkul),
  sks_diakui SMALLINT NOT NULL CHECK (sks_diakui > 0)
);

CREATE TABLE IF NOT EXISTS penugasan_dosen (
  id_penugasan SERIAL PRIMARY KEY,
  id_konversi INTEGER NOT NULL UNIQUE REFERENCES pengajuan_konversi (id_konversi),
  id_dosen INTEGER NOT NULL REFERENCES dosen (id_dosen),
  ditetapkan_oleh INTEGER REFERENCES admin (id_admin),
  ditetapkan_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dokumen_akhir (
  id_dokumen SERIAL PRIMARY KEY,
  id_penerimaan INTEGER NOT NULL REFERENCES penerimaan_magang (id_penerimaan),
  jenis_dokumen VARCHAR(20) NOT NULL CHECK (jenis_dokumen IN ('laporan_akhir', 'sertifikat', 'nilai_mitra', 'logbook')),
  file_dokumen VARCHAR(255),
  nama_asli VARCHAR(120),
  ringkasan TEXT,
  status_periksa VARCHAR(20) NOT NULL DEFAULT 'menunggu' CHECK (status_periksa IN ('menunggu', 'perlu_perbaikan', 'disetujui')),
  catatan_dosen TEXT,
  diperiksa_oleh INTEGER REFERENCES dosen (id_dosen),
  diperiksa_pada TIMESTAMPTZ,
  ttd_digital BOOLEAN NOT NULL DEFAULT FALSE,
  diunggah_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_penerimaan, jenis_dokumen)
);

CREATE TABLE IF NOT EXISTS template_surat (
  id_template SERIAL PRIMARY KEY,
  jenis_surat VARCHAR(20) NOT NULL CHECK (jenis_surat IN ('rekomendasi', 'konversi')),
  nama_template VARCHAR(100) NOT NULL,
  file_template VARCHAR(255) NOT NULL,
  is_aktif BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS template_aktif_per_jenis ON template_surat (jenis_surat) WHERE is_aktif;

CREATE TABLE IF NOT EXISTS surat (
  id_surat SERIAL PRIMARY KEY,
  jenis_surat VARCHAR(20) NOT NULL CHECK (jenis_surat IN ('rekomendasi', 'konversi')),
  nomor_surat VARCHAR(50) NOT NULL,
  id_pengajuan INTEGER REFERENCES pengajuan_rekomendasi (id_pengajuan),
  id_konversi INTEGER REFERENCES pengajuan_konversi (id_konversi),
  id_template INTEGER REFERENCES template_surat (id_template),
  file_pdf VARCHAR(255) NOT NULL,
  diterbitkan_oleh INTEGER REFERENCES admin (id_admin),
  diterbitkan_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS surat_nomor_unik ON surat (nomor_surat);

CREATE TABLE IF NOT EXISTS notifikasi_email (
  id_notifikasi SERIAL PRIMARY KEY,
  id_user INTEGER NOT NULL REFERENCES users (id_user),
  jenis_event VARCHAR(30) NOT NULL,
  subjek VARCHAR(150) NOT NULL,
  status_kirim VARCHAR(10) NOT NULL CHECK (status_kirim IN ('terkirim', 'gagal')),
  dikirim_pada TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS riwayat_status (
  id_riwayat_status SERIAL PRIMARY KEY,
  jenis_objek VARCHAR(30) NOT NULL CHECK (jenis_objek IN ('pengajuan_rekomendasi', 'pengajuan_konversi')),
  id_objek INTEGER NOT NULL,
  status_lama VARCHAR(20),
  status_baru VARCHAR(20) NOT NULL,
  diubah_oleh INTEGER REFERENCES users (id_user),
  diubah_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS riwayat_status_objek ON riwayat_status (jenis_objek, id_objek);

-- Kolom tambahan dari desain Figma admin.
ALTER TABLE admin ADD COLUMN IF NOT EXISTS notif_dibaca_pada TIMESTAMPTZ NOT NULL DEFAULT now(); -- "Tandai Semua Dibaca" pada lonceng
ALTER TABLE periode_magang ADD COLUMN IF NOT EXISTS semester VARCHAR(6); -- Ganjil | Genap
ALTER TABLE dokumen_pengajuan ADD COLUMN IF NOT EXISTS diunggah_pada TIMESTAMPTZ NOT NULL DEFAULT now(); -- kolom "Tanggal unggah"
ALTER TABLE detail_konversi ADD COLUMN IF NOT EXISTS keterangan VARCHAR(200); -- kolom "Keterangan" pada hasil pemetaan

ALTER TABLE mahasiswa ADD COLUMN IF NOT EXISTS alamat VARCHAR(200); -- tercetak pada surat rekomendasi

-- Desain dosen: pemeriksaan ulang, batas revisi, tanda tangan laporan, riwayat dokumen, notifikasi dosen.
ALTER TABLE dosen ADD COLUMN IF NOT EXISTS notif_dibaca_pada TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE dokumen_akhir ADD COLUMN IF NOT EXISTS batas_revisi DATE;
ALTER TABLE dokumen_akhir ADD COLUMN IF NOT EXISTS file_ttd VARCHAR(255); -- laporan bertanda tangan (digital atau unggahan dosen)
ALTER TABLE dokumen_akhir ADD COLUMN IF NOT EXISTS nama_ttd VARCHAR(120);
ALTER TABLE dokumen_akhir ADD COLUMN IF NOT EXISTS ditandatangani_pada TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS riwayat_dokumen (
  id_riwayat SERIAL PRIMARY KEY,
  id_dokumen INTEGER NOT NULL REFERENCES dokumen_akhir (id_dokumen) ON DELETE CASCADE,
  aksi VARCHAR(20) NOT NULL CHECK (aksi IN ('diunggah', 'disetujui', 'perbaikan', 'ditandatangani')),
  oleh INTEGER REFERENCES users (id_user),
  catatan TEXT,
  waktu TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE riwayat_dokumen ENABLE ROW LEVEL SECURITY;

-- Desain mahasiswa: logbook harian di sistem dan lonceng notifikasi mahasiswa.
ALTER TABLE mahasiswa ADD COLUMN IF NOT EXISTS notif_dibaca_pada TIMESTAMPTZ NOT NULL DEFAULT now();
-- Logbook kini hanya berkas PDF opsional di dokumen_akhir; entri harian dan ringkasan teks dihapus (migrasi untuk DB lama).
DROP TABLE IF EXISTS logbook_entri;
ALTER TABLE dokumen_akhir ADD COLUMN IF NOT EXISTS ringkasan TEXT;
-- Sinkron dengan SDD v2: kolom yang tidak ada di SDD dihapus. "Menunggu pemeriksaan ulang" dibaca dari riwayat_dokumen (aksi perbaikan).
ALTER TABLE mahasiswa DROP COLUMN IF EXISTS jumlah_sks;
ALTER TABLE dokumen_akhir DROP COLUMN IF EXISTS pernah_perbaikan, DROP COLUMN IF EXISTS ukuran, ALTER COLUMN file_dokumen DROP NOT NULL, ALTER COLUMN nama_asli DROP NOT NULL;
ALTER TABLE penerimaan_magang DROP COLUMN IF EXISTS nama_surat_penerimaan, DROP COLUMN IF EXISTS ukuran_surat_penerimaan;
ALTER TABLE pengajuan_konversi DROP COLUMN IF EXISTS nama_silabus, DROP COLUMN IF EXISTS ukuran_silabus;

-- Hanya server yang mengakses tabel; API publik Supabase (anon/authenticated) ditolak karena tidak ada kebijakan.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosen ENABLE ROW LEVEL SECURITY;
ALTER TABLE mahasiswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE periode_magang ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori_perusahaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan_rekomendasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen_pengajuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE penerimaan_magang ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_magang ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan_konversi ENABLE ROW LEVEL SECURITY;
ALTER TABLE mata_kuliah ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_konversi ENABLE ROW LEVEL SECURITY;
ALTER TABLE penugasan_dosen ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen_akhir ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifikasi_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_status ENABLE ROW LEVEL SECURITY;
