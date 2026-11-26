// Rute Mahasiswa (/api/mahasiswa): data diri, surat rekomendasi, konversi SKS, dan dokumen magang.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Galat, catat, iso, kirimPdf, q, riwayatDari, salah, satu } from '../lib.js';
import {
  BATAS_KIRIM_MINGGUAN, BATAS_MAGANG, DOKUMEN_AKHIR, DOKUMEN_REKOMENDASI, cekKelayakan, hariIni, jadwal, nomorTampil,
  validasiIdentitas, validasiPdf, validasiPengajuan, validasiPenerimaan, validasiProfil, validasiRiwayat, pernahPerbaikan,
} from '../rules.js';

const TEMPLATE_LAPORAN = fileURLToPath(new URL('../templates/Template_Laporan_Akhir.docx', import.meta.url));
const TEMPLATE_SILABUS = fileURLToPath(new URL('../templates/Form_Magang_Mitra_2026.docx', import.meta.url));
const pdf = express.raw({ type: 'application/pdf', limit: '2mb' });

const berkas = (nama, ukuran) => (nama ? { nama, ukuran } : null);
const namaBerkas = (req) => {
  try {
    return path.basename(decodeURIComponent(req.get('x-filename') ?? 'berkas.pdf')).replace(/[\x00-\x1f<>:"|?*\\]/g, '_').slice(0, 120) || 'berkas.pdf';
  } catch {
    return 'berkas.pdf'; // header bukan encoding URL yang sah
  }
};
const nomorDari = (kode, p, id) => nomorTampil(kode, iso(p), id);

export default function routerMahasiswa({ db, storage, email }) {
  const r = express.Router();

  // ---------- pembantu ----------
  const mahasiswaDari = (c, user) => satu(c, 'SELECT * FROM mahasiswa WHERE id_user = $1', [user.id_user]);
  async function perluProfil(c, user) {
    const m = await mahasiswaDari(c, user);
    if (!m) throw new Galat(409, 'Lengkapi data diri terlebih dahulu.');
    return m;
  }
  // Anti-spam: maksimal BATAS_KIRIM_MINGGUAN kali mengirim/mengirim ulang per jenis dalam 7 hari (pengajuan yang ditolak pun dihitung).
  // Baris mahasiswa dikunci agar dua permintaan bersamaan tidak sama-sama lolos.
  async function batasKirim(c, user, idMhs, jenis, nama) {
    await c.query('SELECT 1 FROM mahasiswa WHERE id_mahasiswa = $1 FOR UPDATE', [idMhs]);
    const terkirim = await q(c, `SELECT diubah_pada FROM riwayat_status WHERE jenis_objek = $1 AND status_baru = 'diajukan' AND diubah_oleh = $2
      AND diubah_pada > now() - interval '7 days' ORDER BY diubah_pada`, [jenis, user.id_user]);
    if (terkirim.length >= BATAS_KIRIM_MINGGUAN) {
      const lagi = new Date(new Date(terkirim[0].diubah_pada).getTime() + 7 * 86_400_000).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' });
      throw new Galat(429, `Batas pengiriman ${nama} tercapai (maksimal ${BATAS_KIRIM_MINGGUAN} kali per 7 hari). Anda bisa mengirim lagi mulai ${lagi}.`);
    }
  }
  const periodeTerbaru = (c) => satu(c, "SELECT * FROM periode_magang WHERE status = 'dipublikasikan' ORDER BY id_periode DESC LIMIT 1");
  async function wajibDibuka(c, jenis, nama) {
    const p = await periodeTerbaru(c);
    if (jadwal(p ?? { tgl_buka: '9999-01-01', tgl_tutup: '9999-01-02' }).find((x) => x.jenis === jenis)?.status !== 'dibuka') throw new Galat(409, `Periode ${nama} sedang tidak dibuka.`);
  }
  const kategoriSemua = (c) => q(c, 'SELECT id_kategori AS id, nama_kategori, is_diizinkan FROM kategori_perusahaan ORDER BY id_kategori');
  const dokumenPdf = (req) => {
    salah(validasiPdf(req.body));
    return req.body;
  };

  // ---------- profil (FR-16, UI-03, UI-05) ----------
  async function tampilProfil(c, user) {
    const m = await mahasiswaDari(c, user);
    if (!m) return { terdaftar: false, nama: user.nama, email: user.email, batas_magang: BATAS_MAGANG };
    const riwayat = await q(c, 'SELECT id_riwayat AS id, nama_perusahaan, tahun, sumber FROM riwayat_magang WHERE id_mahasiswa = $1 ORDER BY tahun, id_riwayat', [m.id_mahasiswa]);
    return {
      terdaftar: true, nama: user.nama, email: user.email, npm: m.npm, ipk: m.ipk, semester: m.semester,
      alamat: m.alamat, no_telepon: m.no_telepon, status_aktif: m.status_aktif, status_cuti: m.status_cuti, ada_nilai_e: m.ada_nilai_e,
      status_verifikasi: m.status_verifikasi, catatan_verifikasi: m.catatan_verifikasi, riwayat_magang: riwayat, batas_magang: BATAS_MAGANG,
    };
  }

  r.get('/me', async (req, res) => {
    await db.query('UPDATE users SET last_login = now() WHERE id_user = $1', [req.user.id_user]);
    res.json(await tampilProfil(db, req.user));
  });

  r.put('/me', async (req, res) => {
    const b = req.body;
    const user = req.user;
    const ada = await mahasiswaDari(db, user);
    // Identitas hanya diisi sekali; email berasal dari akun login, bukan dari formulir.
    if (!ada) salah(validasiIdentitas({ nama: b.nama, npm: b.npm, email: user.email }));
    salah(validasiProfil(b));
    try {
      await db.transaksi(async (c) => {
        const nilai = [Number(b.ipk), Number(b.semester), b.no_telepon, !!b.status_aktif, !!b.status_cuti, !!b.ada_nilai_e, b.alamat.trim()];
        if (ada) {
          // Data berubah → Admin Prodi perlu memverifikasi ulang (FR-16).
          await c.query(`UPDATE mahasiswa SET ipk=$1, semester=$2, no_telepon=$3, status_aktif=$4, status_cuti=$5, ada_nilai_e=$6, alamat=$7,
            status_verifikasi='menunggu', catatan_verifikasi=NULL WHERE id_user=$8`, [...nilai, user.id_user]);
        } else {
          await c.query('UPDATE users SET nama = $1 WHERE id_user = $2', [b.nama.trim(), user.id_user]);
          await c.query(`INSERT INTO mahasiswa (id_user, npm, ipk, semester, no_telepon, status_aktif, status_cuti, ada_nilai_e, alamat)
            VALUES ($8, $9, $1, $2, $3, $4, $5, $6, $7)`, [...nilai, user.id_user, b.npm]);
          user.nama = b.nama.trim();
        }
      });
    } catch (e) {
      if (e.code === '23505') throw new Galat(409, 'NPM ini sudah terdaftar pada akun lain. Jika ini NPM Anda, hubungi Admin Prodi.');
      throw e;
    }
    res.json(await tampilProfil(db, user));
  });

  r.post('/riwayat', async (req, res) => {
    salah(validasiRiwayat(req.body));
    await db.transaksi(async (c) => {
      const m = await perluProfil(c, req.user);
      const { n } = await satu(c, 'SELECT count(*) AS n FROM riwayat_magang WHERE id_mahasiswa = $1', [m.id_mahasiswa]);
      if (n >= BATAS_MAGANG) throw new Galat(409, `Batas ${BATAS_MAGANG} kali magang sudah tercapai.`);
      await c.query("INSERT INTO riwayat_magang (id_mahasiswa, nama_perusahaan, tahun, sumber) VALUES ($1, $2, $3, 'input_mahasiswa')", [m.id_mahasiswa, req.body.nama_perusahaan.trim(), Number(req.body.tahun)]);
      await c.query("UPDATE mahasiswa SET status_verifikasi = 'menunggu' WHERE id_mahasiswa = $1", [m.id_mahasiswa]);
    });
    res.status(201).json(await tampilProfil(db, req.user));
  });

  r.get('/kelayakan', async (req, res) => {
    const m = await perluProfil(db, req.user);
    const { n } = await satu(db, 'SELECT count(*) AS n FROM riwayat_magang WHERE id_mahasiswa = $1', [m.id_mahasiswa]);
    res.json(cekKelayakan(m, n, await periodeTerbaru(db)));
  });

  // ---------- surat rekomendasi (FR-02, FR-05, FR-10; UI-06, UI-07) ----------
  async function muatPengajuan(c, idMhs, id) {
    const rows = await q(c, `SELECT p.*, k.nama_kategori FROM pengajuan_rekomendasi p JOIN kategori_perusahaan k USING (id_kategori)
      WHERE p.id_mahasiswa = $1 ${id ? 'AND p.id_pengajuan = $2' : ''} ORDER BY p.id_pengajuan`, id ? [idMhs, id] : [idMhs]);
    if (!rows.length) return [];
    const ids = rows.map((p) => p.id_pengajuan);
    const dok = await q(c, 'SELECT * FROM dokumen_pengajuan WHERE id_pengajuan = ANY($1::int[])', [ids]);
    const rw = await q(c, "SELECT * FROM riwayat_status WHERE jenis_objek = 'pengajuan_rekomendasi' AND id_objek = ANY($1::int[]) ORDER BY id_riwayat_status", [ids]);
    const surat = await q(c, 'SELECT * FROM surat WHERE id_pengajuan = ANY($1::int[])', [ids]);
    const penerimaan = await q(c, 'SELECT id_pengajuan FROM penerimaan_magang WHERE id_pengajuan = ANY($1::int[])', [ids]);
    return rows.map((p) => {
      const s = surat.find((x) => x.id_pengajuan === p.id_pengajuan);
      return {
        id: p.id_pengajuan,
        nomor: nomorDari('REK', p.dibuat_pada, p.id_pengajuan),
        status: p.status,
        nama_perusahaan: p.nama_perusahaan,
        kepada: p.kepada,
        alamat_perusahaan: p.alamat_perusahaan,
        id_kategori: p.id_kategori,
        kategori: p.nama_kategori,
        tgl_mulai: p.tgl_mulai,
        tgl_selesai: p.tgl_selesai,
        dibuat_pada: iso(p.dibuat_pada),
        alasan_penolakan: p.alasan_penolakan,
        riwayat: riwayatDari(rw, 'pengajuan_rekomendasi', p.id_pengajuan),
        dokumen_syarat: DOKUMEN_REKOMENDASI.map((x) => {
          const d = dok.find((i) => i.id_pengajuan === p.id_pengajuan && i.jenis_dokumen === x.jenis);
          return { ...x, berkas: berkas(d?.nama_asli) };
        }),
        surat: s ? { nomor_surat: s.nomor_surat, diterbitkan_pada: iso(s.diterbitkan_pada) } : null,
        punya_konversi: penerimaan.some((x) => x.id_pengajuan === p.id_pengajuan),
      };
    });
  }
  async function pengajuanSaya(c, user, id, { draft = false } = {}) {
    const m = await perluProfil(c, user);
    const [p] = await muatPengajuan(c, m.id_mahasiswa, Number(id));
    if (!p) throw new Galat(404, 'Pengajuan tidak ditemukan.');
    if (draft && p.status !== 'draft') throw new Galat(409, 'Pengajuan yang sudah dikirim tidak dapat diubah.');
    return { m, p };
  }
  const jenisRekomendasi = (jenis) => {
    if (!DOKUMEN_REKOMENDASI.some((x) => x.jenis === jenis)) throw new Galat(404, 'Jenis dokumen tidak dikenal.');
    return jenis;
  };
  const kolomPengajuan = (b) => [Number(b.id_kategori), b.nama_perusahaan.trim(), b.kepada.trim(), b.alamat_perusahaan.trim(), b.tgl_mulai, b.tgl_selesai];

  r.get('/rekomendasi', async (req, res) => {
    const m = await perluProfil(db, req.user);
    res.json({ kategori: await kategoriSemua(db), pengajuan: (await muatPengajuan(db, m.id_mahasiswa)).reverse() });
  });

  r.get('/rekomendasi/:id', async (req, res) => res.json((await pengajuanSaya(db, req.user, req.params.id)).p));

  r.post('/rekomendasi', async (req, res) => {
    const hasil = await db.transaksi(async (c) => {
      const m = await perluProfil(c, req.user);
      await wajibDibuka(c, 'pengajuan', 'pengajuan surat rekomendasi');
      salah(validasiPengajuan(req.body, await kategoriSemua(c)));
      const periode = await periodeTerbaru(c);
      const { id_pengajuan: id } = await satu(c, `INSERT INTO pengajuan_rekomendasi (id_mahasiswa, id_periode, id_kategori, nama_perusahaan, kepada, alamat_perusahaan, tgl_mulai, tgl_selesai, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft') RETURNING id_pengajuan`, [m.id_mahasiswa, periode.id_periode, ...kolomPengajuan(req.body)]);
      await c.query("INSERT INTO riwayat_status (jenis_objek, id_objek, status_baru, diubah_oleh) VALUES ('pengajuan_rekomendasi', $1, 'draft', $2)", [id, req.user.id_user]);
      return (await muatPengajuan(c, m.id_mahasiswa, id))[0];
    });
    res.status(201).json(hasil);
  });

  r.put('/rekomendasi/:id', async (req, res) => {
    res.json(await db.transaksi(async (c) => {
      const { m, p } = await pengajuanSaya(c, req.user, req.params.id, { draft: true });
      salah(validasiPengajuan(req.body, await kategoriSemua(c)));
      await c.query(`UPDATE pengajuan_rekomendasi SET id_kategori=$1, nama_perusahaan=$2, kepada=$3, alamat_perusahaan=$4, tgl_mulai=$5, tgl_selesai=$6 WHERE id_pengajuan=$7`, [...kolomPengajuan(req.body), p.id]);
      return (await muatPengajuan(c, m.id_mahasiswa, p.id))[0];
    }));
  });

  r.post('/rekomendasi/:id/dokumen/:jenis', pdf, async (req, res) => {
    const isi = dokumenPdf(req);
    const jenis = jenisRekomendasi(req.params.jenis);
    const { m, p } = await pengajuanSaya(db, req.user, req.params.id, { draft: true });
    const lokasi = await storage.simpan(isi, `mahasiswa/${m.id_mahasiswa}/rekomendasi`);
    try {
      const lama = await satu(db, `SELECT file_dokumen FROM dokumen_pengajuan WHERE id_pengajuan = $1 AND jenis_dokumen = $2`, [p.id, jenis]);
      await db.query(`INSERT INTO dokumen_pengajuan (id_pengajuan, jenis_dokumen, file_dokumen, nama_asli, ukuran) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id_pengajuan, jenis_dokumen) DO UPDATE SET file_dokumen = EXCLUDED.file_dokumen, nama_asli = EXCLUDED.nama_asli, ukuran = EXCLUDED.ukuran, diunggah_pada = now()`, [p.id, jenis, lokasi, namaBerkas(req), isi.length]);
      await storage.hapus(lama?.file_dokumen);
    } catch (e) {
      await storage.hapus(lokasi);
      throw e;
    }
    res.json((await muatPengajuan(db, m.id_mahasiswa, p.id))[0]);
  });

  r.delete('/rekomendasi/:id/dokumen/:jenis', async (req, res) => {
    const { m, p } = await pengajuanSaya(db, req.user, req.params.id, { draft: true });
    const hapus = await satu(db, 'DELETE FROM dokumen_pengajuan WHERE id_pengajuan = $1 AND jenis_dokumen = $2 RETURNING file_dokumen', [p.id, jenisRekomendasi(req.params.jenis)]);
    await storage.hapus(hapus?.file_dokumen);
    res.json((await muatPengajuan(db, m.id_mahasiswa, p.id))[0]);
  });

  r.get('/rekomendasi/:id/dokumen/:jenis', async (req, res) => {
    const { p } = await pengajuanSaya(db, req.user, req.params.id);
    const d = await satu(db, 'SELECT * FROM dokumen_pengajuan WHERE id_pengajuan = $1 AND jenis_dokumen = $2', [p.id, jenisRekomendasi(req.params.jenis)]);
    if (!d) throw new Galat(404, 'Berkas belum tersedia.');
    kirimPdf(res, await storage.baca(d.file_dokumen), d.nama_asli);
  });

  r.post('/rekomendasi/:id/kirim', async (req, res) => {
    const hasil = await db.transaksi(async (c) => {
      const { m, p } = await pengajuanSaya(c, req.user, req.params.id, { draft: true });
      await wajibDibuka(c, 'pengajuan', 'pengajuan surat rekomendasi');
      await batasKirim(c, req.user, m.id_mahasiswa, 'pengajuan_rekomendasi', 'surat rekomendasi');
      const kurang = p.dokumen_syarat.filter((x) => x.wajib && !x.berkas).map((x) => x.label);
      if (kurang.length) throw new Galat(400, `Dokumen wajib belum lengkap: ${kurang.join(', ')}.`);
      await c.query('UPDATE pengajuan_rekomendasi SET alasan_penolakan = NULL WHERE id_pengajuan = $1', [p.id]);
      await catat(c, 'pengajuan_rekomendasi', p.id, 'draft', 'diajukan', req.user.id_user);
      return (await muatPengajuan(c, m.id_mahasiswa, p.id))[0];
    });
    await email?.kirim({
      idUser: req.user.id_user,
      email: req.user.email,
      nama: req.user.nama,
      jenisEvent: 'pengajuan_terkirim',
      subjek: `[SIGMA UG] Pengajuan Surat Rekomendasi Terkirim (${hasil.nama_perusahaan})`,
      pesan: `Pengajuan surat rekomendasi magang Anda (${hasil.nomor}) untuk ${hasil.nama_perusahaan} telah berhasil dikirim dan menunggu pemeriksaan Admin Prodi.`,
    });
    res.json(hasil);
  });

  r.get('/rekomendasi/:id/surat', async (req, res) => {
    const { p } = await pengajuanSaya(db, req.user, req.params.id);
    const s = await satu(db, 'SELECT * FROM surat WHERE id_pengajuan = $1', [p.id]);
    if (!s) throw new Galat(404, 'Surat belum diterbitkan.');
    kirimPdf(res, await storage.baca(s.file_pdf), `${s.nomor_surat.replaceAll('/', '-')}.pdf`);
  });

  // ---------- penerimaan magang & konversi SKS (FR-06, FR-07, FR-08; UI-08, UI-09) ----------
  // Satu pengajuan_konversi selalu bertaut ke satu penerimaan_magang (SDD tabel 10 dan 11).
  // Mahasiswa yang tidak mengambil konversi hanya membuat penerimaan_magang (pilih_konversi = FALSE) tanpa pengajuan_konversi (US-11, US-12).
  async function buatPenerimaan(c, user, idPengajuan, body, pilihKonversi) {
    const m = await perluProfil(c, user);
    const [p] = await muatPengajuan(c, m.id_mahasiswa, Number(idPengajuan));
    if (!p) throw new Galat(404, 'Surat rekomendasi tidak ditemukan.');
    if (p.status !== 'diterbitkan') throw new Galat(409, 'Surat rekomendasi belum diterbitkan.');
    if (p.punya_konversi) throw new Galat(409, 'Surat rekomendasi ini sudah memiliki laporan penerimaan atau pengajuan konversi.');
    salah(validasiPenerimaan(body));
    const { id_penerimaan: idPenerimaan } = await satu(
      c,
      "INSERT INTO penerimaan_magang (id_pengajuan, posisi, tgl_mulai, tgl_selesai, pilih_konversi, status) VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING id_penerimaan",
      [p.id, ...kolomPenerimaan(body), pilihKonversi],
    );
    return { m, p, idPenerimaan };
  }

  // Mengunggah PDF ke satu kolom tabel lalu menghapus berkas lama bila berhasil; bila gagal di DB, berkas baru dibersihkan.
  async function simpanBerkasTabel({ tabel, kunci, idNilai, kolom, folder, buffer }) {
    const lama = await satu(db, `SELECT ${kolom} AS file FROM ${tabel} WHERE ${kunci} = $1`, [idNilai]);
    const lokasi = await storage.simpan(buffer, folder);
    try {
      await db.query(`UPDATE ${tabel} SET ${kolom} = $1 WHERE ${kunci} = $2`, [lokasi, idNilai]);
    } catch (e) {
      await storage.hapus(lokasi);
      throw e;
    }
    await storage.hapus(lama?.file);
  }

  // Magang yang sudah diterima perusahaan (baik konversi maupun mandiri) dicatat sekali ke riwayat_magang (BR-03).
  async function catatRiwayatPenerimaan(c, idMhs, namaPerusahaan, tglMulai, idPengajuan) {
    await c.query("UPDATE penerimaan_magang SET status = 'diterima_perusahaan' WHERE id_pengajuan = $1", [idPengajuan]);
    await c.query(`INSERT INTO riwayat_magang (id_mahasiswa, nama_perusahaan, tahun, sumber, id_penerimaan)
      SELECT $1, $2, $3, 'sistem', n.id_penerimaan FROM penerimaan_magang n WHERE n.id_pengajuan = $4
        AND NOT EXISTS (SELECT 1 FROM riwayat_magang r WHERE r.id_penerimaan = n.id_penerimaan)`,
    [idMhs, namaPerusahaan, Number(tglMulai.slice(0, 4)), idPengajuan]);
  }

  async function muatPenerimaanMandiri(c, idMhs, id) {
    const rows = await q(c, `SELECT n.*, p.nama_perusahaan, p.alamat_perusahaan, p.dibuat_pada AS rek_dibuat_pada
      FROM penerimaan_magang n JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      WHERE p.id_mahasiswa = $1 AND n.pilih_konversi = FALSE ${id ? 'AND n.id_penerimaan = $2' : ''} ORDER BY n.id_penerimaan`, id ? [idMhs, id] : [idMhs]);
    return rows.map((n) => ({
      id: n.id_penerimaan,
      id_pengajuan: n.id_pengajuan,
      nomor_rekomendasi: nomorDari('REK', n.rek_dibuat_pada, n.id_pengajuan),
      status: n.status,
      pilih_konversi: false,
      nama_perusahaan: n.nama_perusahaan,
      alamat_perusahaan: n.alamat_perusahaan,
      posisi: n.posisi,
      tgl_mulai: n.tgl_mulai,
      tgl_selesai: n.tgl_selesai,
      surat_penerimaan: n.file_surat_penerimaan ? { nama: 'Surat penerimaan.pdf' } : null,
    }));
  }
  async function penerimaanSaya(c, user, id, { draft = false } = {}) {
    const m = await perluProfil(c, user);
    const [n] = await muatPenerimaanMandiri(c, m.id_mahasiswa, Number(id));
    if (!n) throw new Galat(404, 'Laporan penerimaan magang tidak ditemukan.');
    if (draft && n.status !== 'draft') throw new Galat(409, 'Laporan penerimaan yang sudah dikirim tidak dapat diubah.');
    return { m, n };
  }

  async function muatKonversi(c, idMhs, id) {
    const rows = await q(c, `SELECT k.*, n.id_pengajuan, n.posisi, n.tgl_mulai, n.tgl_selesai, n.file_surat_penerimaan, p.nama_perusahaan
      FROM pengajuan_konversi k JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      WHERE p.id_mahasiswa = $1 ${id ? 'AND k.id_konversi = $2' : ''} ORDER BY k.id_konversi`, id ? [idMhs, id] : [idMhs]);
    if (!rows.length) return [];
    const ids = rows.map((k) => k.id_konversi);
    const detail = await q(c, 'SELECT d.id_konversi, m.kode_mk, m.nama_mk, d.sks_diakui FROM detail_konversi d JOIN mata_kuliah m ON m.id_matkul = d.id_matkul WHERE d.id_konversi = ANY($1::int[]) ORDER BY d.id_detail', [ids]);
    const dosen = await q(c, 'SELECT pd.id_konversi, u.nama FROM penugasan_dosen pd JOIN dosen ds ON ds.id_dosen = pd.id_dosen JOIN users u ON u.id_user = ds.id_user WHERE pd.id_konversi = ANY($1::int[])', [ids]);
    const rw = await q(c, "SELECT * FROM riwayat_status WHERE jenis_objek = 'pengajuan_konversi' AND id_objek = ANY($1::int[]) ORDER BY id_riwayat_status", [ids]);
    const surat = await q(c, 'SELECT id_konversi FROM surat WHERE id_konversi = ANY($1::int[])', [ids]);
    return rows.map((k) => {
      const matkul = detail.filter((d) => d.id_konversi === k.id_konversi).map(({ kode_mk, nama_mk, sks_diakui }) => ({ kode_mk, nama_mk, sks_diakui }));
      const namaDosen = dosen.find((d) => d.id_konversi === k.id_konversi)?.nama ?? null;
      return {
        id: k.id_konversi,
        nomor: nomorDari('KNV', k.dibuat_pada, k.id_konversi),
        status: k.status,
        alasan_penolakan: k.alasan_penolakan,
        dibuat_pada: iso(k.dibuat_pada),
        riwayat: riwayatDari(rw, 'pengajuan_konversi', k.id_konversi),
        id_pengajuan: k.id_pengajuan,
        nama_perusahaan: k.nama_perusahaan,
        posisi: k.posisi,
        tgl_mulai: k.tgl_mulai,
        tgl_selesai: k.tgl_selesai,
        surat_penerimaan: k.file_surat_penerimaan ? { nama: 'Surat penerimaan.pdf' } : null,
        silabus: k.file_silabus ? { nama: 'Silabus.pdf' } : null,
        dosen_pendamping: namaDosen,
        hasil: matkul.length && ['diproses', 'diterbitkan', 'selesai'].includes(k.status) ? { dosen_pendamping: namaDosen, matkul } : null, // pemetaan belum final sebelum disetujui
        surat_tersedia: surat.some((s) => s.id_konversi === k.id_konversi),
      };
    });
  }
  async function konversiSaya(c, user, id, { ubah = false } = {}) {
    const m = await perluProfil(c, user);
    const [k] = await muatKonversi(c, m.id_mahasiswa, Number(id));
    if (!k) throw new Galat(404, 'Pengajuan konversi tidak ditemukan.');
    if (ubah && !['draft', 'ditolak'].includes(k.status)) throw new Galat(409, 'Pengajuan konversi yang sudah dikirim tidak dapat diubah.');
    return { m, k };
  }
  const kolomPenerimaan = (b) => [b.posisi.trim(), b.tgl_mulai, b.tgl_selesai];

  r.get('/konversi', async (req, res) => {
    const m = await perluProfil(db, req.user);
    const siap = await q(db, `SELECT p.id_pengajuan AS id, p.nama_perusahaan, p.dibuat_pada FROM pengajuan_rekomendasi p
      WHERE p.id_mahasiswa = $1 AND p.status = 'diterbitkan' AND NOT EXISTS (SELECT 1 FROM penerimaan_magang n WHERE n.id_pengajuan = p.id_pengajuan) ORDER BY p.id_pengajuan`, [m.id_mahasiswa]);
    res.json({
      siap_diajukan: siap.map((p) => ({ id: p.id, nomor: nomorDari('REK', p.dibuat_pada, p.id), nama_perusahaan: p.nama_perusahaan })),
      konversi: (await muatKonversi(db, m.id_mahasiswa)).reverse(),
      mandiri: (await muatPenerimaanMandiri(db, m.id_mahasiswa)).reverse(),
      template_tersedia: fs.existsSync(TEMPLATE_SILABUS),
    });
  });

  r.get('/konversi/template-silabus', (_req, res) => {
    if (!fs.existsSync(TEMPLATE_SILABUS)) throw new Galat(404, 'Form isian magang belum disediakan prodi.');
    res.download(TEMPLATE_SILABUS);
  });

  // --- Magang mandiri tanpa konversi SKS (UC-11, pilih_konversi = FALSE) ---
  r.get('/penerimaan/:id', async (req, res) => res.json((await penerimaanSaya(db, req.user, req.params.id)).n));

  r.post('/penerimaan', async (req, res) => {
    const b = req.body ?? {};
    res.status(201).json(await db.transaksi(async (c) => {
      const { m, idPenerimaan } = await buatPenerimaan(c, req.user, b.id_pengajuan, b, false);
      return (await muatPenerimaanMandiri(c, m.id_mahasiswa, idPenerimaan))[0];
    }));
  });

  r.put('/penerimaan/:id', async (req, res) => {
    res.json(await db.transaksi(async (c) => {
      const { m, n } = await penerimaanSaya(c, req.user, req.params.id, { draft: true });
      salah(validasiPenerimaan(req.body ?? {}));
      await c.query('UPDATE penerimaan_magang SET posisi = $1, tgl_mulai = $2, tgl_selesai = $3 WHERE id_penerimaan = $4', [...kolomPenerimaan(req.body), n.id]);
      return (await muatPenerimaanMandiri(c, m.id_mahasiswa, n.id))[0];
    }));
  });

  r.delete('/penerimaan/:id', async (req, res) => {
    const { n } = await penerimaanSaya(db, req.user, req.params.id, { draft: true });
    const row = await satu(db, "DELETE FROM penerimaan_magang WHERE id_penerimaan = $1 AND status = 'draft' RETURNING file_surat_penerimaan", [n.id]);
    await storage.hapus(row?.file_surat_penerimaan);
    res.json({ ok: true });
  });

  r.post('/penerimaan/:id/surat-penerimaan', pdf, async (req, res) => {
    const isi = dokumenPdf(req);
    const { m, n } = await penerimaanSaya(db, req.user, req.params.id, { draft: true });
    await simpanBerkasTabel({ tabel: 'penerimaan_magang', kunci: 'id_penerimaan', idNilai: n.id, kolom: 'file_surat_penerimaan', folder: `mahasiswa/${m.id_mahasiswa}/penerimaan`, buffer: isi });
    res.json((await muatPenerimaanMandiri(db, m.id_mahasiswa, n.id))[0]);
  });

  r.get('/penerimaan/:id/surat-penerimaan', async (req, res) => {
    const { n } = await penerimaanSaya(db, req.user, req.params.id);
    const d = await satu(db, 'SELECT file_surat_penerimaan AS file FROM penerimaan_magang WHERE id_penerimaan = $1', [n.id]);
    if (!d?.file) throw new Galat(404, 'Berkas belum tersedia.');
    kirimPdf(res, await storage.baca(d.file), 'surat-penerimaan.pdf');
  });

  r.post('/penerimaan/:id/kirim', async (req, res) => {
    res.json(await db.transaksi(async (c) => {
      const { m, n } = await penerimaanSaya(c, req.user, req.params.id, { draft: true });
      if (!n.surat_penerimaan) throw new Galat(400, 'Surat penerimaan perusahaan belum diunggah.');
      await catatRiwayatPenerimaan(c, m.id_mahasiswa, n.nama_perusahaan, n.tgl_mulai, n.id_pengajuan);
      return (await muatPenerimaanMandiri(c, m.id_mahasiswa, n.id))[0];
    }));
  });

  r.get('/konversi/:id', async (req, res) => res.json((await konversiSaya(db, req.user, req.params.id)).k));

  r.post('/konversi', async (req, res) => {
    const b = req.body ?? {};
    res.status(201).json(await db.transaksi(async (c) => {
      await wajibDibuka(c, 'konversi', 'pengajuan konversi SKS');
      const { m, idPenerimaan } = await buatPenerimaan(c, req.user, b.id_pengajuan, b, true);
      const { id_konversi: k } = await satu(c, "INSERT INTO pengajuan_konversi (id_penerimaan, status) VALUES ($1, 'draft') RETURNING id_konversi", [idPenerimaan]);
      await c.query("INSERT INTO riwayat_status (jenis_objek, id_objek, status_baru, diubah_oleh) VALUES ('pengajuan_konversi', $1, 'draft', $2)", [k, req.user.id_user]);
      return (await muatKonversi(c, m.id_mahasiswa, k))[0];
    }));
  });

  r.put('/konversi/:id', async (req, res) => {
    res.json(await db.transaksi(async (c) => {
      const { m, k } = await konversiSaya(c, req.user, req.params.id, { ubah: true });
      salah(validasiPenerimaan(req.body));
      await c.query('UPDATE penerimaan_magang SET posisi = $1, tgl_mulai = $2, tgl_selesai = $3 WHERE id_pengajuan = $4', [...kolomPenerimaan(req.body), k.id_pengajuan]);
      return (await muatKonversi(c, m.id_mahasiswa, k.id))[0];
    }));
  });

  // Dua berkas konversi tersimpan di tabel berbeda; peta ini menjaga SQL tetap satu pola.
  const BERKAS_KONVERSI = {
    'surat-penerimaan': { tabel: 'penerimaan_magang', kunci: 'id_pengajuan', nilai: (k) => k.id_pengajuan, kolom: 'file_surat_penerimaan' },
    silabus: { tabel: 'pengajuan_konversi', kunci: 'id_konversi', nilai: (k) => k.id, kolom: 'file_silabus' },
  };
  for (const [rute, b] of Object.entries(BERKAS_KONVERSI)) {
    r.post(`/konversi/:id/${rute}`, pdf, async (req, res) => {
      const isi = dokumenPdf(req);
      const { m, k } = await konversiSaya(db, req.user, req.params.id, { ubah: true });
      await simpanBerkasTabel({ tabel: b.tabel, kunci: b.kunci, idNilai: b.nilai(k), kolom: b.kolom, folder: `mahasiswa/${m.id_mahasiswa}/konversi`, buffer: isi });
      res.json((await muatKonversi(db, m.id_mahasiswa, k.id))[0]);
    });
    r.get(`/konversi/:id/${rute}`, async (req, res) => {
      const { k } = await konversiSaya(db, req.user, req.params.id);
      const d = await satu(db, `SELECT ${b.kolom} AS file FROM ${b.tabel} WHERE ${b.kunci} = $1`, [b.nilai(k)]);
      if (!d?.file) throw new Galat(404, 'Berkas belum tersedia.');
      kirimPdf(res, await storage.baca(d.file), `${rute}.pdf`);
    });
  }

  r.post('/konversi/:id/kirim', async (req, res) => {
    const hasil = await db.transaksi(async (c) => {
      const { m, k } = await konversiSaya(c, req.user, req.params.id, { ubah: true });
      await wajibDibuka(c, 'konversi', 'pengajuan konversi SKS');
      await batasKirim(c, req.user, m.id_mahasiswa, 'pengajuan_konversi', 'konversi SKS');
      if (!k.surat_penerimaan) throw new Galat(400, 'Surat penerimaan perusahaan belum diunggah.');
      if (!k.silabus) throw new Galat(400, 'Silabus magang belum diunggah.');
      await catatRiwayatPenerimaan(c, m.id_mahasiswa, k.nama_perusahaan, k.tgl_mulai, k.id_pengajuan);
      await c.query('UPDATE pengajuan_konversi SET alasan_penolakan = NULL WHERE id_konversi = $1', [k.id]);
      await catat(c, 'pengajuan_konversi', k.id, k.status, 'diajukan', req.user.id_user);
      return (await muatKonversi(c, m.id_mahasiswa, k.id))[0];
    });
    await email?.kirim({
      idUser: req.user.id_user,
      email: req.user.email,
      nama: req.user.nama,
      jenisEvent: 'konversi_terkirim',
      subjek: `[SIGMA UG] Pengajuan Konversi SKS Terkirim (${hasil.nama_perusahaan})`,
      pesan: `Pengajuan konversi SKS Anda (${hasil.nomor}) untuk magang di ${hasil.nama_perusahaan} telah berhasil dikirim dan menunggu pemeriksaan Admin Prodi.`,
    });
    res.json(hasil);
  });

  r.get('/konversi/:id/surat', async (req, res) => {
    const { k } = await konversiSaya(db, req.user, req.params.id);
    const s = await satu(db, 'SELECT * FROM surat WHERE id_konversi = $1', [k.id]);
    if (!s) throw new Galat(404, 'Surat konversi belum diterbitkan.');
    kirimPdf(res, await storage.baca(s.file_pdf), `${s.nomor_surat.replaceAll('/', '-')}.pdf`);
  });

  // ---------- dokumen magang (FR-12, FR-13, FR-14; UI-10) ----------
  // Magang berjalan = pengajuan konversi sudah dikirim dan tidak ditolak.
  const magangAktif = (c, idMhs) => satu(c, `SELECT k.id_konversi, n.id_penerimaan, n.tgl_mulai, n.tgl_selesai, p.nama_perusahaan
    FROM pengajuan_konversi k JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
    WHERE p.id_mahasiswa = $1 AND k.status NOT IN ('draft', 'ditolak') ORDER BY k.id_konversi DESC LIMIT 1`, [idMhs]);
  const jenisAkhir = (jenis) => {
    if (!DOKUMEN_AKHIR.some((x) => x.jenis === jenis)) throw new Galat(404, 'Jenis dokumen tidak dikenal.');
    return jenis;
  };

  async function tampilDokumenMagang(c, idMhs) {
    const mg = await magangAktif(c, idMhs);
    if (!mg) return { ada_magang: false };
    const docs = await q(c, `SELECT *, ${pernahPerbaikan('dokumen_akhir')} FROM dokumen_akhir WHERE id_penerimaan = $1`, [mg.id_penerimaan]);
    const dosen = await satu(c, 'SELECT u.nama FROM penugasan_dosen pd JOIN dosen ds ON ds.id_dosen = pd.id_dosen JOIN users u ON u.id_user = ds.id_user WHERE pd.id_konversi = $1', [mg.id_konversi]);
    const periode = await periodeTerbaru(c);
    const pemeriksa = await q(c, 'SELECT d.id_dokumen, u.nama FROM dokumen_akhir d JOIN dosen ds ON ds.id_dosen = d.diperiksa_oleh JOIN users u ON u.id_user = ds.id_user WHERE d.id_penerimaan = $1', [mg.id_penerimaan]);
    const batas = periode?.batas_laporan ?? null;
    const dokumen = DOKUMEN_AKHIR.map((x) => {
      const a = docs.find((d) => d.jenis_dokumen === x.jenis);
      return {
        ...x,
        status: a ? a.status_periksa : 'belum_diunggah', // belum_diunggah | menunggu | perlu_perbaikan | disetujui
        menunggu_ulang: a?.status_periksa === 'menunggu' && a.pernah_perbaikan,
        batas_revisi: a?.status_periksa === 'perlu_perbaikan' ? a.batas_revisi : null,
        ada_ttd: !!a?.file_ttd,
        berkas: berkas(a?.nama_asli),
        catatan_dosen: a?.catatan_dosen ?? null,
        diunggah_pada: iso(a?.diunggah_pada) ?? null,
        diperiksa_pada: iso(a?.diperiksa_pada) ?? null,
        pemeriksa: pemeriksa.find((p) => p.id_dokumen === a?.id_dokumen)?.nama ?? null,
        ditandatangani_pada: iso(a?.ditandatangani_pada) ?? null,
      };
    });
    const wajib = dokumen.filter((x) => x.wajib);
    const selesai = wajib.every((x) => x.status === 'disetujui');
    return {
      ada_magang: true,
      template_laporan_tersedia: fs.existsSync(TEMPLATE_LAPORAN),
      id_konversi: mg.id_konversi,
      perusahaan: mg.nama_perusahaan,
      dosen_pendamping: dosen?.nama ?? null,
      tgl_mulai: mg.tgl_mulai,
      tgl_selesai: mg.tgl_selesai,
      batas_laporan: batas,
      batas_lewat: !!batas && hariIni() > batas,
      dokumen,
      wajib_disetujui: wajib.filter((x) => x.status === 'disetujui').length,
      wajib_total: wajib.length,
      selesai,
      tanggal_selesai: selesai ? wajib.map((x) => x.diperiksa_pada).sort().at(-1)?.slice(0, 10) : null,
    };
  }

  // Menaruh/menimpa dokumen akhir; yang sudah disetujui dosen terkunci, batas laporan berlaku (US-18).
  // Mengembalikan berkas lama (bila ada) agar dihapus setelah transaksi berhasil.
  async function simpanDokumenAkhir(c, idMhs, jenis, isi) {
    const mg = await magangAktif(c, idMhs);
    if (!mg) throw new Galat(409, 'Belum ada magang yang berjalan. Ajukan konversi SKS terlebih dahulu.');
    const periode = await periodeTerbaru(c);
    if (periode?.batas_laporan && hariIni() > periode.batas_laporan) throw new Galat(409, 'Batas pengumpulan dokumen sudah lewat.');
    const lama = await satu(c, 'SELECT * FROM dokumen_akhir WHERE id_penerimaan = $1 AND jenis_dokumen = $2', [mg.id_penerimaan, jenis]);
    if (lama?.status_periksa === 'disetujui') throw new Galat(409, 'Dokumen yang sudah disetujui tidak dapat diganti.');
    const baru = await c.query(`INSERT INTO dokumen_akhir (id_penerimaan, jenis_dokumen, file_dokumen, nama_asli)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id_penerimaan, jenis_dokumen) DO UPDATE SET file_dokumen = EXCLUDED.file_dokumen, nama_asli = EXCLUDED.nama_asli,
        status_periksa = 'menunggu', catatan_dosen = NULL, batas_revisi = NULL, diperiksa_oleh = NULL, diperiksa_pada = NULL, diunggah_pada = now()
      RETURNING id_dokumen`,
    [mg.id_penerimaan, jenis, isi.file, isi.nama]);
    await c.query("INSERT INTO riwayat_dokumen (id_dokumen, aksi, oleh) VALUES ($1, 'diunggah', $2)", [baru.rows[0].id_dokumen, isi.oleh]);
    return lama?.file_dokumen;
  }

  r.get('/dokumen-magang', async (req, res) => res.json(await tampilDokumenMagang(db, (await perluProfil(db, req.user)).id_mahasiswa)));

  r.post('/dokumen-magang/:jenis', pdf, async (req, res) => {
    const jenis = jenisAkhir(req.params.jenis);
    const isi = dokumenPdf(req);
    const m = await perluProfil(db, req.user);
    const lokasi = await storage.simpan(isi, `mahasiswa/${m.id_mahasiswa}/dokumen-akhir`);
    let lama;
    try {
      lama = await db.transaksi((c) => simpanDokumenAkhir(c, m.id_mahasiswa, jenis, { file: lokasi, nama: namaBerkas(req), oleh: req.user.id_user }));
    } catch (e) {
      await storage.hapus(lokasi);
      throw e;
    }
    await storage.hapus(lama);
    res.json(await tampilDokumenMagang(db, m.id_mahasiswa));
  });

  r.get('/dokumen-magang/:jenis/berkas', async (req, res) => {
    const m = await perluProfil(db, req.user);
    const mg = await magangAktif(db, m.id_mahasiswa);
    const a = mg && (await satu(db, 'SELECT * FROM dokumen_akhir WHERE id_penerimaan = $1 AND jenis_dokumen = $2', [mg.id_penerimaan, jenisAkhir(req.params.jenis)]));
    if (!a?.file_dokumen) throw new Galat(404, 'Berkas belum tersedia.');
    kirimPdf(res, await storage.baca(a.file_dokumen), a.nama_asli);
  });

  r.get('/dokumen-magang/laporan_akhir/ttd', async (req, res) => {
    const m = await perluProfil(db, req.user);
    const mg = await magangAktif(db, m.id_mahasiswa);
    const a = mg && (await satu(db, "SELECT file_ttd, nama_ttd FROM dokumen_akhir WHERE id_penerimaan = $1 AND jenis_dokumen = 'laporan_akhir'", [mg.id_penerimaan]));
    if (!a?.file_ttd) throw new Galat(404, 'Laporan bertanda tangan belum tersedia.');
    kirimPdf(res, await storage.baca(a.file_ttd), a.nama_ttd);
  });

  r.get('/dokumen-magang/laporan_akhir/template', (_req, res) => {
    if (!fs.existsSync(TEMPLATE_LAPORAN)) throw new Galat(404, 'Template laporan akhir belum disediakan prodi.');
    res.download(TEMPLATE_LAPORAN);
  });

  // ---------- notifikasi (lonceng) ----------
  // Peristiwa dihitung dari riwayat yang sudah ada; yang disimpan hanya mahasiswa.notif_dibaca_pada.
  const NAMA_DOK = { laporan_akhir: 'Laporan Akhir', nilai_mitra: 'Nilai Akhir Mitra', sertifikat: 'Sertifikat Magang', logbook: 'Logbook' };
  r.get('/notifikasi', async (req, res) => {
    const m = await perluProfil(db, req.user);
    const sejak = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const item = [];
    for (const x of await q(db, `SELECT rs.status_lama, rs.status_baru, rs.diubah_pada AS waktu, p.id_pengajuan AS id, p.nama_perusahaan FROM riwayat_status rs JOIN pengajuan_rekomendasi p ON p.id_pengajuan = rs.id_objek
      WHERE rs.jenis_objek = 'pengajuan_rekomendasi' AND p.id_mahasiswa = $1 AND rs.diubah_pada > $2 AND (rs.status_baru IN ('diterbitkan', 'ditolak') OR (rs.status_baru = 'draft' AND rs.status_lama = 'diajukan'))`, [m.id_mahasiswa, sejak])) {
      item.push({ judul: x.status_baru === 'diterbitkan' ? 'Surat rekomendasi diterbitkan' : x.status_baru === 'ditolak' ? 'Pengajuan surat rekomendasi ditolak' : 'Pengajuan diminta diperbaiki', nama: x.nama_perusahaan, waktu: x.waktu, to: `/surat-rekomendasi/riwayat/${x.id}` });
    }
    for (const x of await q(db, `SELECT rs.status_baru, rs.diubah_pada AS waktu, k.id_konversi AS id, p.nama_perusahaan FROM riwayat_status rs JOIN pengajuan_konversi k ON k.id_konversi = rs.id_objek
      JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      WHERE rs.jenis_objek = 'pengajuan_konversi' AND p.id_mahasiswa = $1 AND rs.diubah_pada > $2 AND rs.status_baru IN ('diterbitkan', 'ditolak')`, [m.id_mahasiswa, sejak])) {
      item.push({ judul: x.status_baru === 'diterbitkan' ? 'Konversi SKS disetujui' : 'Pengajuan konversi SKS ditolak', nama: x.nama_perusahaan, waktu: x.waktu, to: `/konversi-sks/riwayat/${x.id}` });
    }
    for (const x of await q(db, `SELECT rd.aksi, rd.waktu, d.jenis_dokumen FROM riwayat_dokumen rd JOIN dokumen_akhir d USING (id_dokumen) JOIN penerimaan_magang n ON n.id_penerimaan = d.id_penerimaan
      JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan WHERE p.id_mahasiswa = $1 AND rd.aksi IN ('disetujui', 'perbaikan', 'ditandatangani') AND rd.waktu > $2`, [m.id_mahasiswa, sejak])) {
      item.push({ judul: { disetujui: 'Dokumen disetujui', perbaikan: 'Dokumen perlu perbaikan', ditandatangani: 'Laporan ditandatangani dosen' }[x.aksi], nama: NAMA_DOK[x.jenis_dokumen], waktu: x.waktu, to: '/dokumen-magang/monitoring' });
    }
    for (const x of await q(db, `SELECT pd.ditetapkan_pada AS waktu, u.nama FROM penugasan_dosen pd JOIN dosen ds ON ds.id_dosen = pd.id_dosen JOIN users u ON u.id_user = ds.id_user
      JOIN pengajuan_konversi k ON k.id_konversi = pd.id_konversi JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      WHERE p.id_mahasiswa = $1 AND pd.ditetapkan_pada > $2`, [m.id_mahasiswa, sejak])) {
      item.push({ judul: 'Dosen pendamping ditetapkan', nama: x.nama, waktu: x.waktu, to: '/dokumen-magang' });
    }
    const periode = await periodeTerbaru(db);
    const mg = await magangAktif(db, m.id_mahasiswa);
    const sisa = (tgl) => (tgl ? Math.round((Date.parse(tgl) - Date.parse(hariIni())) / 86_400_000) : null);
    const ingat = [];
    if (periode && !(await satu(db, "SELECT 1 FROM pengajuan_rekomendasi WHERE id_mahasiswa = $1 AND status <> 'draft'", [m.id_mahasiswa]))) ingat.push(['Tenggat pengajuan surat rekomendasi', sisa(periode.tgl_tutup), '/surat-rekomendasi']);
    if (periode && !mg && (await satu(db, "SELECT 1 FROM pengajuan_rekomendasi WHERE id_mahasiswa = $1 AND status = 'diterbitkan'", [m.id_mahasiswa]))) ingat.push(['Tenggat pengajuan konversi SKS', sisa(periode.batas_konversi), '/konversi-sks']);
    if (periode && mg) ingat.push(['Tenggat pengumpulan dokumen magang', sisa(periode.batas_laporan), '/dokumen-magang']);
    for (const [judul, s, to] of ingat) if (s !== null && s >= 0 && s <= 3) item.push({ judul: 'Pengingat tenggat', nama: `${judul}: ${s === 0 ? 'hari ini' : `${s} hari lagi`}`, waktu: new Date(`${hariIni()}T00:00:00Z`), to });
    const dibaca = new Date(m.notif_dibaca_pada);
    const semua = item.map((x) => ({ ...x, waktu: iso(x.waktu), baru: new Date(x.waktu) > dibaca })).sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
    res.json({ belum_dibaca: semua.filter((x) => x.baru).length, item: semua.slice(0, 10) });
  });

  r.post('/notifikasi/baca', async (req, res) => {
    const m = await perluProfil(db, req.user);
    await db.query('UPDATE mahasiswa SET notif_dibaca_pada = now() WHERE id_mahasiswa = $1', [m.id_mahasiswa]);
    res.json({ ok: true });
  });

  // ---------- dasbor (UI-05) ----------
  r.get('/dashboard', async (req, res) => {
    const m = await perluProfil(db, req.user);
    const pengajuan = await muatPengajuan(db, m.id_mahasiswa);
    const konversi = await muatKonversi(db, m.id_mahasiswa);
    const dokumen = await tampilDokumenMagang(db, m.id_mahasiswa);
    const { n: sudahMagang } = await satu(db, 'SELECT count(*) AS n FROM riwayat_magang WHERE id_mahasiswa = $1', [m.id_mahasiswa]);

    const tindakan = [];
    const draft = pengajuan.find((p) => p.status === 'draft');
    if (m.status_verifikasi === 'tidak_sesuai') tindakan.push({ teks: `Data diri Anda ditandai tidak sesuai${m.catatan_verifikasi ? `: ${m.catatan_verifikasi}` : '.'} Mohon perbaiki.`, tautan: '/profil', label: 'Perbaiki Data Diri' });
    if (draft) tindakan.push({ teks: 'Anda punya pengajuan surat rekomendasi yang belum dikirim.', tautan: `/surat-rekomendasi?draft=${draft.id}`, label: 'Lanjutkan Pengajuan' });
    if (pengajuan.some((p) => p.status === 'diterbitkan' && !p.punya_konversi)) tindakan.push({ teks: 'Surat rekomendasi sudah terbit. Setelah diterima perusahaan, unggah surat penerimaan dan silabus.', tautan: '/konversi-sks', label: 'Unggah Surat Penerimaan' });
    const ditolak = konversi.find((k) => k.status === 'ditolak');
    if (ditolak) tindakan.push({ teks: 'Pengajuan konversi SKS ditolak. Periksa alasannya lalu ajukan ulang.', tautan: `/konversi-sks/riwayat/${ditolak.id}`, label: 'Lihat Alasan' });
    if (dokumen.ada_magang && dokumen.dokumen.some((x) => x.status === 'perlu_perbaikan')) tindakan.push({ teks: 'Ada dokumen magang yang perlu Anda perbaiki.', tautan: '/dokumen-magang', label: 'Buka Dokumen Magang' });

    res.json({
      sudah_magang: sudahMagang,
      batas_magang: BATAS_MAGANG,
      dosen_pendamping: dokumen.dosen_pendamping ?? null,
      sks_konversi: konversi.flatMap((k) => k.hasil?.matkul ?? []).reduce((total, mk) => total + mk.sks_diakui, 0),
      pengajuan: pengajuan.filter((p) => p.status !== 'draft').slice(-5).reverse().map((p) => ({
        id: p.id, nama_perusahaan: p.nama_perusahaan, tanggal: (p.riwayat.find((x) => x.status === 'diajukan')?.pada ?? p.dibuat_pada).slice(0, 10), status: p.status, surat_tersedia: !!p.surat,
      })),
      tindakan,
    });
  });

  return r;
}
