// Rute Admin Prodi (/api/admin). Akun admin berhak setara; setiap tindakan menyimpan id_admin agar bisa ditelusuri.
// Menyetujui pengajuan rekomendasi atau konversi langsung menerbitkan suratnya; dosen pendamping ditetapkan terpisah.
import express from 'express';
import { Galat, catat, iso, kirimPdf, q, riwayatDari, salah, satu } from '../lib.js';
import {
  BATAS_MAGANG, DOKUMEN_AKHIR, alasanSah, evaluasiPengajuan, hariIni, jadwal, nomorTampil, syaratPengajuan,
  bacaTtd, validasiAkunDosen, validasiHasilKonversi, validasiMataKuliah, validasiNomorSurat, validasiPeriode,
} from '../rules.js';
import { angkaTerbilang, bulanTahunId, buatSuratPdf, lamaBulan, nomorSuratBerikut, tanggalAngkaId, tanggalPanjangId } from '../surat.js';

const TEMPLAT = { rekomendasi: 'surat-rekomendasi.txt', konversi: 'surat-konversi.txt' };
const WAJIB = DOKUMEN_AKHIR.filter((d) => d.wajib).map((d) => d.jenis);
const NAMA_DOKUMEN_AKHIR = Object.fromEntries(DOKUMEN_AKHIR.map((d) => [d.jenis, d.label]));
// Keterangan bawaan mengikuti templat surat konversi prodi; admin boleh mengubahnya per mata kuliah.
const KETERANGAN_AWAL = 'Tidak mengikuti perkuliahan, UTS, UAS/Ujian Utama, Praktikum Penunjang dan Wajib Mengikuti Ujian Capaian Pembelajaran.';
const angkatan = (npm) => `20${npm.slice(3, 5)}`; // 11123292 → 2023

const daftarId = (ids) => {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every((i) => Number.isInteger(i) && i > 0)) throw new Galat(400, 'Pilih minimal satu pengajuan (maksimal 200).');
  return [...new Set(ids)];
};
const berkas = (nama, ukuran) => (nama ? { nama, ukuran } : null);
const cocok = (kata, ...isi) => !kata || isi.some((x) => `${x ?? ''}`.toLowerCase().includes(kata.trim().toLowerCase()));
const urut = (rows, kolom) => rows.map((r) => ({ ...r, [kolom]: iso(r[kolom]) }));

export default function routerAdmin({ db, storage, akun }) {
  const r = express.Router();

  r.use(async (req, _res, next) => {
    req.admin = await satu(db, 'SELECT * FROM admin WHERE id_user = $1', [req.user.id_user]);
    if (!req.admin) throw new Galat(403, 'Profil admin belum dibuat. Hubungi tim pengembang.');
    next();
  });

  // Periode berjalan = yang terbaru dan sudah dipublikasikan (draft belum terlihat mahasiswa).
  const periodeTerbaru = (c) => satu(c, "SELECT * FROM periode_magang WHERE status = 'dipublikasikan' ORDER BY id_periode DESC LIMIT 1");
  const namaAdmin = async (c, idAdmin) => (idAdmin ? (await satu(c, 'SELECT u.nama FROM admin a JOIN users u USING (id_user) WHERE a.id_admin = $1', [idAdmin]))?.nama ?? null : null);
  const templatTerpasang = async (c, jenis) => {
    const ada = await satu(c, 'SELECT id_template FROM template_surat WHERE jenis_surat = $1 AND is_aktif', [jenis]);
    if (ada) return ada.id_template;
    return (await satu(c, "INSERT INTO template_surat (jenis_surat, nama_template, file_template) VALUES ($1, 'Templat bawaan', $2) RETURNING id_template", [jenis, `/templates/${TEMPLAT[jenis]}`])).id_template;
  };
  const hitung = async (sql, p) => (await satu(db, sql, p)).n;

  const riwayatPelaku = (c, jenis, id) => q(c, `SELECT rs.status_lama, rs.status_baru, rs.diubah_pada, u.nama, u.peran FROM riwayat_status rs LEFT JOIN users u ON u.id_user = rs.diubah_oleh
    WHERE rs.jenis_objek = $1 AND rs.id_objek = $2 ORDER BY rs.id_riwayat_status`, [jenis, id]);

  // ---------- notifikasi (lonceng) ----------
  // Peristiwa dihitung dari data yang sudah ada (pengajuan masuk, dokumen diunggah, tenggat). Hanya status "dibaca" yang disimpan: admin.notif_dibaca_pada.
  r.get('/notifikasi', async (req, res) => {
    const sejak = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const rek = await q(db, `SELECT rs.id_objek AS id, rs.diubah_pada AS waktu, u.nama FROM riwayat_status rs JOIN pengajuan_rekomendasi p ON p.id_pengajuan = rs.id_objek
      JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user WHERE rs.jenis_objek = 'pengajuan_rekomendasi' AND rs.status_baru = 'diajukan' AND rs.diubah_pada > $1`, [sejak]);
    const knv = await q(db, `SELECT rs.id_objek AS id, rs.diubah_pada AS waktu, u.nama FROM riwayat_status rs JOIN pengajuan_konversi k ON k.id_konversi = rs.id_objek
      JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user WHERE rs.jenis_objek = 'pengajuan_konversi' AND rs.status_baru = 'diajukan' AND rs.diubah_pada > $1`, [sejak]);
    const dok = await q(db, `SELECT d.jenis_dokumen, d.diunggah_pada AS waktu, k.id_konversi AS id, u.nama FROM dokumen_akhir d JOIN pengajuan_konversi k ON k.id_penerimaan = d.id_penerimaan
      JOIN penerimaan_magang n ON n.id_penerimaan = d.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user WHERE d.diunggah_pada > $1`, [sejak]);
    const item = [
      ...rek.map((x) => ({ judul: 'Pengajuan surat rekomendasi baru', nama: x.nama, waktu: x.waktu, to: `/admin/rekomendasi/${x.id}` })),
      ...knv.map((x) => ({ judul: 'Pengajuan konversi SKS baru', nama: x.nama, waktu: x.waktu, to: `/admin/konversi/${x.id}` })),
      ...dok.map((x) => ({ judul: `${NAMA_DOKUMEN_AKHIR[x.jenis_dokumen] ?? 'Dokumen'} baru diunggah`, nama: x.nama, waktu: x.waktu, to: `/admin/monitoring/${x.id}` })),
    ];
    const periode = await periodeTerbaru(db);
    if (periode) {
      const sisa = Math.round((Date.parse(periode.tgl_tutup) - Date.parse(hariIni())) / 86_400_000);
      if (sisa >= 0 && sisa <= 3) item.push({ judul: 'Deadline pengajuan hampir berakhir', nama: `Periode ${periode.tahun_akademik.slice(4)}`, waktu: new Date(`${hariIni()}T00:00:00Z`), tambahan: sisa === 0 ? 'Hari ini' : `${sisa} hari lagi`, to: '/admin/periode' });
    }
    const dibaca = new Date(req.admin.notif_dibaca_pada);
    const semua = item.map((x) => ({ ...x, waktu: iso(x.waktu), baru: new Date(x.waktu) > dibaca })).sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
    res.json({ belum_dibaca: semua.filter((x) => x.baru).length, item: semua.slice(0, 10) });
  });

  r.post('/notifikasi/baca', async (req, res) => {
    await db.query('UPDATE admin SET notif_dibaca_pada = now() WHERE id_admin = $1', [req.admin.id_admin]);
    res.json({ ok: true });
  });

  // ---------- dasbor (UI-11) ----------
  r.get('/dashboard', async (_req, res) => {
    const periode = await periodeTerbaru(db);
    const mon = await dataMonitoring(db);
    const rek = await q(db, `SELECT 'rekomendasi' AS jenis, 'Surat Rekomendasi' AS dokumen, p.id_pengajuan AS id, u.nama, m.npm, p.status,
        COALESCE((SELECT max(diubah_pada) FROM riwayat_status rs WHERE rs.jenis_objek = 'pengajuan_rekomendasi' AND rs.id_objek = p.id_pengajuan AND rs.status_baru = 'diajukan'), p.dibuat_pada) AS pada
      FROM pengajuan_rekomendasi p JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user WHERE p.status = 'diajukan' ORDER BY pada DESC LIMIT 5`);
    const knv = await q(db, `SELECT 'konversi' AS jenis, 'Konversi SKS' AS dokumen, k.id_konversi AS id, u.nama, m.npm, k.status,
        COALESCE((SELECT max(diubah_pada) FROM riwayat_status rs WHERE rs.jenis_objek = 'pengajuan_konversi' AND rs.id_objek = k.id_konversi AND rs.status_baru = 'diajukan'), k.dibuat_pada) AS pada
      FROM pengajuan_konversi k JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user WHERE k.status = 'diajukan' ORDER BY pada DESC LIMIT 5`);
    const dok = await q(db, `SELECT 'dokumen' AS jenis, d.jenis_dokumen AS kode, k.id_konversi AS id, u.nama, m.npm, d.status_periksa AS status, d.diunggah_pada AS pada
      FROM dokumen_akhir d JOIN pengajuan_konversi k ON k.id_penerimaan = d.id_penerimaan JOIN penerimaan_magang n ON n.id_penerimaan = d.id_penerimaan
      JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user
      WHERE d.status_periksa = 'menunggu' ORDER BY d.diunggah_pada DESC LIMIT 5`);
    const terbaru = [...rek, ...knv, ...dok.map((x) => ({ ...x, dokumen: NAMA_DOKUMEN_AKHIR[x.kode].replace(' (Bertanda Tangan)', '') }))]
      .sort((a, b) => new Date(b.pada) - new Date(a.pada)).slice(0, 5).map((x) => ({ jenis: x.jenis, dokumen: x.dokumen, id: x.id, nama: x.nama, npm: x.npm, pada: iso(x.pada) }));
    res.json({
      ringkasan: {
        total_mahasiswa: await hitung('SELECT count(*)::int AS n FROM mahasiswa'),
        surat_menunggu: await hitung("SELECT count(*)::int AS n FROM pengajuan_rekomendasi WHERE status = 'diajukan'"),
        konversi_menunggu: await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi WHERE status = 'diajukan'"),
        belum_dosen: await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi k WHERE k.status IN ('diterbitkan', 'selesai') AND NOT EXISTS (SELECT 1 FROM penugasan_dosen d WHERE d.id_konversi = k.id_konversi)"),
        sedang_magang: mon.stat.berjalan,
        dokumen_belum_lengkap: mon.stat.belum_lengkap,
      },
      terbaru,
      periode: periode ? { ...periode, jadwal: jadwal(periode) } : null,
    });
  });

  // ---------- data mahasiswa dan verifikasi data diri (FR-16) ----------
  const barisMahasiswa = (m) => ({
    id: m.id_mahasiswa, id_user: m.id_user, nama: m.nama, email: m.email, npm: m.npm, ipk: m.ipk, semester: m.semester, no_telepon: m.no_telepon,
    status_aktif: m.status_aktif, status_cuti: m.status_cuti, ada_nilai_e: m.ada_nilai_e, is_aktif: m.is_aktif,
    status_verifikasi: m.status_verifikasi, catatan_verifikasi: m.catatan_verifikasi, magang: m.magang,
  });
  const MHS_SQL = `SELECT m.*, u.nama, u.email, u.is_aktif, (SELECT count(*)::int FROM riwayat_magang r WHERE r.id_mahasiswa = m.id_mahasiswa) AS magang
    FROM mahasiswa m JOIN users u USING (id_user)`;

  r.get('/mahasiswa', async (req, res) => {
    const status = ['menunggu', 'terverifikasi', 'tidak_sesuai'].includes(req.query.status) ? req.query.status : null;
    const rows = await q(db, `${MHS_SQL} ${status ? 'WHERE m.status_verifikasi = $1' : ''} ORDER BY m.id_mahasiswa DESC`, status ? [status] : []);
    res.json(rows.filter((m) => cocok(req.query.q, m.nama, m.npm, m.email)).map(barisMahasiswa));
  });

  r.get('/mahasiswa/:id', async (req, res) => {
    const m = await satu(db, `${MHS_SQL} WHERE m.id_mahasiswa = $1`, [Number(req.params.id)]);
    if (!m) throw new Galat(404, 'Mahasiswa tidak ditemukan.');
    const rows = await q(db, `SELECT r.id_riwayat AS id, r.nama_perusahaan, r.tahun, r.sumber, r.id_penerimaan,
        n.posisi, n.tgl_mulai, n.tgl_selesai, n.pilih_konversi, n.file_surat_penerimaan
      FROM riwayat_magang r LEFT JOIN penerimaan_magang n USING (id_penerimaan)
      WHERE r.id_mahasiswa = $1 ORDER BY r.tahun, r.id_riwayat`, [m.id_mahasiswa]);
    const riwayat = rows.map((r) => ({
      id: r.id,
      nama_perusahaan: r.nama_perusahaan,
      tahun: r.tahun,
      sumber: r.sumber,
      id_penerimaan: r.id_penerimaan,
      posisi: r.posisi ?? null,
      tgl_mulai: r.tgl_mulai ?? null,
      tgl_selesai: r.tgl_selesai ?? null,
      jenis: r.id_penerimaan ? (r.pilih_konversi ? 'konversi' : 'mandiri') : null,
      surat_penerimaan: Boolean(r.file_surat_penerimaan),
    }));
    res.json({ ...barisMahasiswa(m), riwayat_magang: riwayat, batas_magang: BATAS_MAGANG });
  });

  r.get('/mahasiswa/:id/penerimaan/:idPenerimaan/surat', async (req, res) => {
    const n = await satu(db, `SELECT n.file_surat_penerimaan FROM penerimaan_magang n
      JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      WHERE p.id_mahasiswa = $1 AND n.id_penerimaan = $2`, [Number(req.params.id), Number(req.params.idPenerimaan)]);
    if (!n?.file_surat_penerimaan) throw new Galat(404, 'Berkas tidak ditemukan.');
    kirimPdf(res, await storage.baca(n.file_surat_penerimaan), 'surat-penerimaan.pdf');
  });

  r.put('/mahasiswa/:id/verifikasi', async (req, res) => {
    const { status, catatan } = req.body ?? {};
    if (!['terverifikasi', 'tidak_sesuai'].includes(status)) throw new Galat(400, 'Status verifikasi tidak valid.');
    if (status === 'tidak_sesuai') salah(alasanSah(catatan)?.replace('penolakan', 'ketidaksesuaian'));
    const hasil = await satu(db, `UPDATE mahasiswa SET status_verifikasi = $1, catatan_verifikasi = $2, diverifikasi_oleh = $3, diverifikasi_pada = now()
      WHERE id_mahasiswa = $4 RETURNING id_mahasiswa`, [status, status === 'tidak_sesuai' ? catatan.trim() : null, req.admin.id_admin, Number(req.params.id)]);
    if (!hasil) throw new Galat(404, 'Mahasiswa tidak ditemukan.');
    res.json({ ok: true });
  });

  // ---------- surat rekomendasi (FR-03, FR-04, FR-05) ----------
  // Lepas NPM: dipakai bila NPM didaftarkan akun yang salah. Data diri dihapus dan akun dinonaktifkan agar pemilik NPM bisa mendaftar ulang.
  // Ditolak (FK 23503) bila akun sudah punya pengajuan atau riwayat magang.
  r.post('/mahasiswa/:id/lepas-npm', async (req, res) => {
    const id = Number(req.params.id);
    const m = await satu(db, 'SELECT id_user FROM mahasiswa WHERE id_mahasiswa = $1', [id]);
    if (!m) throw new Galat(404, 'Mahasiswa tidak ditemukan.');
    try {
      await db.transaksi(async (c) => {
        await c.query('DELETE FROM mahasiswa WHERE id_mahasiswa = $1', [id]);
        await c.query('UPDATE users SET is_aktif = FALSE WHERE id_user = $1', [m.id_user]);
      });
    } catch (e) {
      if (e.code === '23503') throw new Galat(409, 'Akun ini sudah punya pengajuan atau riwayat magang, sehingga NPM tidak bisa dilepas. Nonaktifkan akunnya saja.');
      throw e;
    }
    res.json({ ok: true });
  });

  const REK_SQL = `SELECT p.*, k.nama_kategori, k.is_diizinkan, m.npm, m.ipk, m.semester, m.alamat, m.no_telepon, m.status_aktif, m.status_cuti, m.ada_nilai_e, m.status_verifikasi, m.catatan_verifikasi,
      u.nama AS nama_mhs, u.email AS email_mhs, pr.tahun_akademik,
      (SELECT count(*)::int FROM riwayat_magang r WHERE r.id_mahasiswa = m.id_mahasiswa) AS magang
    FROM pengajuan_rekomendasi p JOIN kategori_perusahaan k USING (id_kategori) JOIN mahasiswa m USING (id_mahasiswa) JOIN users u ON u.id_user = m.id_user
    LEFT JOIN periode_magang pr ON pr.id_periode = p.id_periode`;
  // Daftar memuat pengajuan yang sudah dikirim, termasuk yang dikembalikan ke mahasiswa untuk diperbaiki (draft dengan catatan).
  const KECUALI_DRAFT = "(p.status <> 'draft' OR p.alasan_penolakan IS NOT NULL)";

  function rekomendasiDari(p, riwayat, surat, periode) {
    const daftar = syaratPengajuan(p, p.magang, p.is_diizinkan, periode);
    const gagal = daftar.filter((x) => !x.ok).map((x) => x.gagal);
    return {
      id: p.id_pengajuan, nomor: nomorTampil('REK', iso(p.dibuat_pada), p.id_pengajuan), status: p.status,
      nama_perusahaan: p.nama_perusahaan, kepada: p.kepada, alamat_perusahaan: p.alamat_perusahaan, kategori: p.nama_kategori,
      tgl_mulai: p.tgl_mulai, tgl_selesai: p.tgl_selesai, diajukan_pada: riwayat.find((x) => x.status === 'diajukan')?.pada ?? iso(p.dibuat_pada), alasan_penolakan: p.alasan_penolakan,
      tahun_akademik: p.tahun_akademik,
      mahasiswa: {
        id: p.id_mahasiswa, nama: p.nama_mhs, email: p.email_mhs, npm: p.npm, ipk: p.ipk, semester: p.semester, no_telepon: p.no_telepon, magang: p.magang,
        status_verifikasi: p.status_verifikasi, catatan_verifikasi: p.catatan_verifikasi,
      },
      syarat: { lolos: gagal.length === 0, gagal, daftar: daftar.map(({ label, ok }) => ({ label, ok })) },
      surat: surat ? { nomor_surat: surat.nomor_surat, diterbitkan_pada: iso(surat.diterbitkan_pada) } : null,
    };
  }
  const riwayatRek = (c, ids) => q(c, "SELECT * FROM riwayat_status WHERE jenis_objek = 'pengajuan_rekomendasi' AND id_objek = ANY($1::int[]) ORDER BY id_riwayat_status", [ids]);

  function judulRiwayatRek(rows) {
    let dikembalikan = false;
    return rows.flatMap((x, i) => {
      const berikut = rows[i + 1];
      let judul;
      if (x.status_baru === 'draft') { if (!x.status_lama) return []; dikembalikan = true; judul = 'Diminta perbaikan'; }
      else if (x.status_baru === 'diajukan') judul = dikembalikan ? 'Revisi dikirim mahasiswa' : 'Pengajuan dikirim mahasiswa';
      else if (x.status_baru === 'disetujui') { if (berikut?.status_baru === 'diterbitkan') return []; judul = 'Disetujui'; }
      else if (x.status_baru === 'diterbitkan') judul = 'Disetujui dan surat diterbitkan';
      else judul = 'Ditolak';
      return [{ judul, pada: iso(x.diubah_pada), oleh: x.peran === 'mahasiswa' ? 'Mahasiswa' : x.nama }];
    });
  }

  r.get('/rekomendasi', async (req, res) => {
    const peta = { diajukan: "p.status = 'diajukan'", diterbitkan: "p.status = 'diterbitkan'", ditolak: "p.status = 'ditolak'", perbaikan: "p.status = 'draft'" };
    const rows = await q(db, `${REK_SQL} WHERE ${KECUALI_DRAFT} ${peta[req.query.status] ? `AND ${peta[req.query.status]}` : ''} ORDER BY p.id_pengajuan DESC`);
    const rw = rows.length ? await riwayatRek(db, rows.map((p) => p.id_pengajuan)) : [];
    const periode = await periodeTerbaru(db);
    res.json(rows.filter((p) => cocok(req.query.q, p.nama_mhs, p.npm, p.nama_perusahaan))
      .map((p) => rekomendasiDari(p, riwayatDari(rw, 'pengajuan_rekomendasi', p.id_pengajuan), null, periode)));
  });

  r.get('/rekomendasi/:id', async (req, res) => {
    const id = Number(req.params.id);
    const p = await satu(db, `${REK_SQL} WHERE p.id_pengajuan = $1 AND ${KECUALI_DRAFT}`, [id]);
    if (!p) throw new Galat(404, 'Pengajuan tidak ditemukan.');
    const rw = await riwayatRek(db, [id]);
    const dok = await q(db, 'SELECT jenis_dokumen, nama_asli, ukuran, diunggah_pada FROM dokumen_pengajuan WHERE id_pengajuan = $1', [id]);
    const surat = await satu(db, 'SELECT * FROM surat WHERE id_pengajuan = $1', [id]);
    res.json({
      ...rekomendasiDari(p, riwayatDari(rw, 'pengajuan_rekomendasi', id), surat, await periodeTerbaru(db)),
      dokumen: dok.map((d) => ({ jenis: d.jenis_dokumen, ...berkas(d.nama_asli, d.ukuran), diunggah_pada: iso(d.diunggah_pada) })),
      riwayat: riwayatDari(rw, 'pengajuan_rekomendasi', id),
      riwayat_detail: judulRiwayatRek(await riwayatPelaku(db, 'pengajuan_rekomendasi', id)),
      admin_pemeriksa: await namaAdmin(db, p.divalidasi_oleh),
      disetujui_pada: p.status === 'diterbitkan' ? iso(p.divalidasi_pada) : null,
    });
  });

  r.get('/rekomendasi/:id/dokumen/:jenis', async (req, res) => {
    const d = await satu(db, 'SELECT * FROM dokumen_pengajuan WHERE id_pengajuan = $1 AND jenis_dokumen = $2', [Number(req.params.id), req.params.jenis]);
    if (!d) throw new Galat(404, 'Berkas tidak ditemukan.');
    kirimPdf(res, await storage.baca(d.file_dokumen), d.nama_asli);
  });

  r.get('/rekomendasi/:id/surat', async (req, res) => {
    const s = await satu(db, 'SELECT * FROM surat WHERE id_pengajuan = $1', [Number(req.params.id)]);
    if (!s) throw new Galat(404, 'Surat belum diterbitkan.');
    kirimPdf(res, await storage.baca(s.file_pdf), `${s.nomor_surat.replaceAll('/', '-')}.pdf`);
  });

  // Isian surat rekomendasi (GUIDE PENGISIAN SURAT REKOM). Penanda tangan selalu Ketua Prodi dan sudah tertulis di templat;
  // tanggal surat = tanggal admin menyetujui.
  const dataRekomendasi = (p, nomor, tanggal, ttd) => ({
    nomor_surat: nomor, kepada: p.kepada, perusahaan: p.nama_perusahaan, alamat_perusahaan: p.alamat_perusahaan,
    nama: p.nama_mhs, alamat: p.alamat ?? '-', npm: p.npm, semester: p.semester, tahun_akademik: p.tahun_akademik ?? '', no_hp: p.no_telepon,
    lama: `${lamaBulan(p.tgl_mulai, p.tgl_selesai)} bulan`, bulan_mulai: bulanTahunId(p.tgl_mulai), bulan_selesai: bulanTahunId(p.tgl_selesai),
    tanggal_surat: tanggalAngkaId(tanggal), ttd_gambar: ttd ?? undefined,
  });
  // Input admin saat menerbitkan: nomor surat (kosong = otomatis) dan tanda tangan digital (kosong = bawaan).
  const opsiSurat = (body) => {
    salah(validasiNomorSurat(body?.nomor_surat));
    const { ttd, galat } = bacaTtd(body?.ttd);
    salah(galat);
    return { nomor: String(body?.nomor_surat ?? '').trim(), ttd };
  };
  const nomorBebas = async (c, nomor) => {
    if (await satu(c, 'SELECT 1 FROM surat WHERE nomor_surat = $1', [nomor])) throw new Galat(409, `Nomor surat ${nomor} sudah dipakai surat lain.`);
  };

  // Menyetujui = menerbitkan surat: status disetujui lalu diterbitkan dicatat berurutan dalam satu transaksi.
  // `baru` menampung berkas yang sudah tersimpan agar bisa dibersihkan bila transaksi gagal.
  async function setujuiDanTerbitkan(c, p, req, baru, { nomor, ttd } = {}) {
    const sekarang = new Date();
    const nomorSurat = nomor || await nomorSuratBerikut(c, 'rekomendasi', 'REK', sekarang);
    await nomorBebas(c, nomorSurat);
    const pdf = await buatSuratPdf(TEMPLAT.rekomendasi, dataRekomendasi(p, nomorSurat, sekarang, ttd));
    const lokasi = await storage.simpan(pdf, 'surat/rekomendasi');
    baru.push(lokasi);
    await c.query('UPDATE pengajuan_rekomendasi SET divalidasi_oleh = $1, divalidasi_pada = now(), alasan_penolakan = NULL WHERE id_pengajuan = $2', [req.admin.id_admin, p.id_pengajuan]);
    await catat(c, 'pengajuan_rekomendasi', p.id_pengajuan, 'diajukan', 'disetujui', req.user.id_user);
    await c.query('INSERT INTO surat (jenis_surat, nomor_surat, id_pengajuan, id_template, file_pdf, diterbitkan_oleh) VALUES ($1, $2, $3, $4, $5, $6)',
      ['rekomendasi', nomorSurat, p.id_pengajuan, await templatTerpasang(c, 'rekomendasi'), lokasi, req.admin.id_admin]);
    await catat(c, 'pengajuan_rekomendasi', p.id_pengajuan, 'disetujui', 'diterbitkan', req.user.id_user);
    return nomorSurat;
  }

  // Pratinjau sebelum terbit: PDF dengan nomor dan TTD yang akan dipakai, tidak disimpan dan tidak mengubah status.
  r.post('/rekomendasi/:id/pratinjau', async (req, res) => {
    const o = opsiSurat(req.body);
    const p = await satu(db, `${REK_SQL} WHERE p.id_pengajuan = $1`, [Number(req.params.id)]);
    if (!p) throw new Galat(404, 'Pengajuan tidak ditemukan.');
    // Surat yang sudah terbit (pratinjau terbit ulang) memakai nomor dan tanggal persetujuannya sendiri.
    const s = await satu(db, 'SELECT nomor_surat, diterbitkan_pada FROM surat WHERE id_pengajuan = $1', [p.id_pengajuan]);
    const tanggal = s?.diterbitkan_pada ?? new Date();
    const nomor = o.nomor || s?.nomor_surat || await nomorSuratBerikut(db, 'rekomendasi', 'REK', tanggal);
    kirimPdf(res, await buatSuratPdf(TEMPLAT.rekomendasi, dataRekomendasi(p, nomor, tanggal, o.ttd)), 'Pratinjau Surat Rekomendasi.pdf');
  });

  // Terbitkan ulang surat yang sudah terbit (mis. hasil validasi massal yang memakai nomor otomatis): nomor/TTD baru,
  // tanggal surat tetap tanggal persetujuan. Berkas lama dihapus setelah transaksi berhasil.
  r.post('/rekomendasi/:id/surat/ulang', async (req, res) => {
    const o = opsiSurat(req.body);
    let lama = null;
    const nomor = await denganPembersihan((baru) => db.transaksi(async (c) => {
      const p = await satu(c, `${REK_SQL} WHERE p.id_pengajuan = $1 FOR UPDATE OF p`, [Number(req.params.id)]);
      if (!p) throw new Galat(404, 'Pengajuan tidak ditemukan.');
      const s = await satu(c, 'SELECT * FROM surat WHERE id_pengajuan = $1', [p.id_pengajuan]);
      if (p.status !== 'diterbitkan' || !s) throw new Galat(409, 'Surat rekomendasi ini belum diterbitkan.');
      const nomorSurat = o.nomor || s.nomor_surat;
      if (nomorSurat !== s.nomor_surat) await nomorBebas(c, nomorSurat);
      const lokasi = await storage.simpan(await buatSuratPdf(TEMPLAT.rekomendasi, dataRekomendasi(p, nomorSurat, s.diterbitkan_pada, o.ttd)), 'surat/rekomendasi');
      baru.push(lokasi);
      await c.query('UPDATE surat SET nomor_surat = $1, file_pdf = $2 WHERE id_surat = $3', [nomorSurat, lokasi, s.id_surat]);
      lama = s.file_pdf;
      return nomorSurat;
    }));
    await storage.hapus(lama);
    res.json({ nomor_surat: nomor });
  });
  const denganPembersihan = async (fn) => {
    const baru = [];
    try {
      return await fn(baru);
    } catch (e) {
      await Promise.all(baru.map((l) => storage.hapus(l)));
      throw e;
    }
  };

  // Validasi massal: yang memenuhi syarat disetujui dan suratnya langsung terbit; yang tidak memenuhi ditolak beserta alasan.
  // Data diri yang belum diverifikasi dilewati. Satu transaksi: gagal di tengah = tidak ada yang berubah (US-07).
  r.post('/rekomendasi/validasi', async (req, res) => {
    const ids = daftarId(req.body?.ids);
    const hasil = await denganPembersihan((baru) => db.transaksi(async (c) => {
      const keluar = [];
      const periode = await periodeTerbaru(c);
      for (const id of ids) {
        const p = await satu(c, `${REK_SQL} WHERE p.id_pengajuan = $1 FOR UPDATE OF p`, [id]);
        if (!p) { keluar.push({ id, hasil: 'dilewati', alasan: 'Pengajuan tidak ditemukan' }); continue; }
        if (p.status !== 'diajukan') { keluar.push({ id, hasil: 'dilewati', alasan: 'Status bukan Diajukan' }); continue; }
        if (p.status_verifikasi !== 'terverifikasi') { keluar.push({ id, hasil: 'dilewati', alasan: 'Data diri mahasiswa belum diverifikasi' }); continue; }
        const gagal = evaluasiPengajuan(p, p.is_diizinkan, p.magang, periode);
        if (gagal.length) {
          await c.query('UPDATE pengajuan_rekomendasi SET divalidasi_oleh = $1, divalidasi_pada = now(), alasan_penolakan = $2 WHERE id_pengajuan = $3', [req.admin.id_admin, gagal.join('; '), id]);
          await catat(c, 'pengajuan_rekomendasi', id, 'diajukan', 'ditolak', req.user.id_user);
          keluar.push({ id, hasil: 'ditolak', alasan: gagal.join('; ') });
        } else {
          keluar.push({ id, hasil: 'disetujui', nomor_surat: await setujuiDanTerbitkan(c, p, req, baru) });
        }
      }
      return keluar;
    }));
    res.json({ hasil });
  });

  // "Setujui Pengajuan": hanya bila data diri terverifikasi dan semua syarat terpenuhi; suratnya langsung terbit.
  r.post('/rekomendasi/:id/setujui', async (req, res) => {
    const id = Number(req.params.id);
    const opsi = opsiSurat(req.body);
    const nomor = await denganPembersihan((baru) => db.transaksi(async (c) => {
      const p = await satu(c, `${REK_SQL} WHERE p.id_pengajuan = $1 FOR UPDATE OF p`, [id]);
      if (!p) throw new Galat(404, 'Pengajuan tidak ditemukan.');
      if (p.status !== 'diajukan') throw new Galat(409, 'Hanya pengajuan Diajukan yang bisa disetujui.');
      if (p.status_verifikasi !== 'terverifikasi') throw new Galat(409, 'Verifikasi data diri mahasiswa terlebih dahulu.');
      const gagal = evaluasiPengajuan(p, p.is_diizinkan, p.magang, await periodeTerbaru(c));
      if (gagal.length) throw new Galat(409, `Syarat belum terpenuhi: ${gagal.join('; ')}. Tolak pengajuan bila memang tidak memenuhi syarat.`);
      return setujuiDanTerbitkan(c, p, req, baru, opsi);
    }));
    res.json({ nomor_surat: nomor });
  });

  // "Minta Perbaikan": pengajuan dikembalikan ke mahasiswa sebagai draft beserta catatan; mahasiswa memperbaiki lalu mengirim ulang.
  r.post('/rekomendasi/:id/perbaikan', async (req, res) => {
    salah(alasanSah(req.body?.catatan)?.replace('penolakan', 'perbaikan'));
    const id = Number(req.params.id);
    await db.transaksi(async (c) => {
      const p = await satu(c, 'SELECT status FROM pengajuan_rekomendasi WHERE id_pengajuan = $1 FOR UPDATE', [id]);
      if (!p) throw new Galat(404, 'Pengajuan tidak ditemukan.');
      if (p.status !== 'diajukan') throw new Galat(409, 'Hanya pengajuan Diajukan yang bisa dikembalikan untuk diperbaiki.');
      await c.query('UPDATE pengajuan_rekomendasi SET divalidasi_oleh = $1, divalidasi_pada = now(), alasan_penolakan = $2 WHERE id_pengajuan = $3', [req.admin.id_admin, req.body.catatan.trim(), id]);
      await catat(c, 'pengajuan_rekomendasi', id, 'diajukan', 'draft', req.user.id_user);
    });
    res.json({ ok: true });
  });

  r.post('/rekomendasi/:id/tolak', async (req, res) => {
    salah(alasanSah(req.body?.alasan));
    const id = Number(req.params.id);
    await db.transaksi(async (c) => {
      const p = await satu(c, 'SELECT status FROM pengajuan_rekomendasi WHERE id_pengajuan = $1 FOR UPDATE', [id]);
      if (!p) throw new Galat(404, 'Pengajuan tidak ditemukan.');
      if (p.status !== 'diajukan') throw new Galat(409, 'Hanya pengajuan Diajukan yang bisa ditolak.');
      await c.query('UPDATE pengajuan_rekomendasi SET divalidasi_oleh = $1, divalidasi_pada = now(), alasan_penolakan = $2 WHERE id_pengajuan = $3', [req.admin.id_admin, req.body.alasan.trim(), id]);
      await catat(c, 'pengajuan_rekomendasi', id, 'diajukan', 'ditolak', req.user.id_user);
    });
    res.json({ ok: true });
  });

  // ---------- konversi SKS (FR-06, FR-07, FR-08) ----------
  const KNV_SQL = `SELECT k.*, n.id_penerimaan, n.id_pengajuan, n.posisi, n.tgl_mulai, n.tgl_selesai, n.file_surat_penerimaan,
      p.nama_perusahaan, p.alamat_perusahaan, pr.tahun_akademik, m.id_mahasiswa, m.npm, m.semester, m.no_telepon, m.status_verifikasi, u.nama AS nama_mhs, u.email AS email_mhs,
      (SELECT count(*)::int FROM riwayat_magang r WHERE r.id_mahasiswa = m.id_mahasiswa) AS magang,
      (SELECT count(*)::int FROM pengajuan_konversi k2 JOIN penerimaan_magang n2 ON n2.id_penerimaan = k2.id_penerimaan JOIN pengajuan_rekomendasi p2 ON p2.id_pengajuan = n2.id_pengajuan
        WHERE p2.id_mahasiswa = m.id_mahasiswa AND k2.status IN ('diproses', 'diterbitkan', 'selesai')) AS disetujui
    FROM pengajuan_konversi k JOIN penerimaan_magang n USING (id_penerimaan) JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
    LEFT JOIN periode_magang pr ON pr.id_periode = p.id_periode
    JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user`;

  async function konversiDari(c, rows) {
    if (!rows.length) return [];
    const ids = rows.map((k) => k.id_konversi);
    const detail = await q(c, 'SELECT d.id_konversi, d.id_matkul, m.kode_mk, m.nama_mk, m.sks, d.sks_diakui, d.keterangan FROM detail_konversi d JOIN mata_kuliah m USING (id_matkul) WHERE d.id_konversi = ANY($1::int[]) ORDER BY d.id_detail', [ids]);
    const dosen = await q(c, `SELECT pd.id_konversi, pd.ditetapkan_pada, ds.id_dosen, ds.nidn, u.nama, ua.nama AS oleh FROM penugasan_dosen pd JOIN dosen ds USING (id_dosen) JOIN users u ON u.id_user = ds.id_user
      LEFT JOIN admin a ON a.id_admin = pd.ditetapkan_oleh LEFT JOIN users ua ON ua.id_user = a.id_user WHERE pd.id_konversi = ANY($1::int[])`, [ids]);
    const rw = await q(c, "SELECT * FROM riwayat_status WHERE jenis_objek = 'pengajuan_konversi' AND id_objek = ANY($1::int[]) ORDER BY id_riwayat_status", [ids]);
    const surat = await q(c, 'SELECT id_konversi, nomor_surat, diterbitkan_pada FROM surat WHERE id_konversi = ANY($1::int[])', [ids]);
    return rows.map((k) => {
      const d = dosen.find((x) => x.id_konversi === k.id_konversi);
      const s = surat.find((x) => x.id_konversi === k.id_konversi);
      const riwayat = riwayatDari(rw, 'pengajuan_konversi', k.id_konversi);
      return {
        id: k.id_konversi, nomor: nomorTampil('KNV', iso(k.dibuat_pada), k.id_konversi), status: k.status, alasan_penolakan: k.alasan_penolakan,
        nama_perusahaan: k.nama_perusahaan, alamat_perusahaan: k.alamat_perusahaan, posisi: k.posisi, tgl_mulai: k.tgl_mulai, tgl_selesai: k.tgl_selesai, tahun_akademik: k.tahun_akademik,
        diajukan_pada: riwayat.find((x) => x.status === 'diajukan')?.pada ?? iso(k.dibuat_pada),
        disetujui_pada: s ? iso(s.diterbitkan_pada) : null,
        mahasiswa: { id: k.id_mahasiswa, nama: k.nama_mhs, email: k.email_mhs, npm: k.npm, semester: k.semester, no_telepon: k.no_telepon, magang: k.magang, status_verifikasi: k.status_verifikasi },
        kuota: { disetujui: k.disetujui, batas: BATAS_MAGANG },
        surat_penerimaan: k.file_surat_penerimaan ? { nama: 'Surat penerimaan.pdf' } : null, silabus: k.file_silabus ? { nama: 'Silabus.pdf' } : null,
        matkul: detail.filter((x) => x.id_konversi === k.id_konversi).map(({ id_matkul, kode_mk, nama_mk, sks, sks_diakui, keterangan }) => ({ id_matkul, kode_mk, nama_mk, sks, sks_diakui, keterangan: keterangan ?? KETERANGAN_AWAL })),
        dosen: d ? { id: d.id_dosen, nama: d.nama, nidn: d.nidn, ditugaskan_pada: iso(d.ditetapkan_pada), oleh: d.oleh } : null,
        surat: s ? { nomor_surat: s.nomor_surat, diterbitkan_pada: iso(s.diterbitkan_pada) } : null,
        riwayat,
      };
    });
  }
  const konversiBerstatus = async (c, id, boleh, pesan) => {
    const k = await satu(c, 'SELECT id_konversi, status, id_penerimaan FROM pengajuan_konversi WHERE id_konversi = $1 FOR UPDATE', [id]);
    if (!k) throw new Galat(404, 'Pengajuan konversi tidak ditemukan.');
    if (!boleh.includes(k.status)) throw new Galat(409, pesan);
    return k;
  };
  const disetujui = "k.status IN ('diterbitkan', 'selesai')";

  r.get('/konversi/ringkasan', async (_req, res) => res.json({
    total: await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi WHERE status <> 'draft'"),
    menunggu: await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi WHERE status = 'diajukan'"),
    pemetaan: await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi WHERE status IN ('ditinjau', 'diproses')"),
    disetujui: await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi WHERE status IN ('diterbitkan', 'selesai')"),
    ditolak: await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi WHERE status = 'ditolak'"),
  }));

  r.get('/konversi', async (req, res) => {
    const peta = { diajukan: "k.status = 'diajukan'", ditinjau: "k.status IN ('ditinjau', 'diproses')", disetujui, ditolak: "k.status = 'ditolak'" };
    const penugasan = { belum: `${disetujui} AND NOT EXISTS (SELECT 1 FROM penugasan_dosen d WHERE d.id_konversi = k.id_konversi)`, sudah: `${disetujui} AND EXISTS (SELECT 1 FROM penugasan_dosen d WHERE d.id_konversi = k.id_konversi)` };
    const syarat = penugasan[req.query.penugasan] ?? peta[req.query.status];
    const rows = await q(db, `${KNV_SQL} WHERE k.status <> 'draft' ${syarat ? `AND ${syarat}` : ''} ORDER BY k.id_konversi DESC`);
    const data = await konversiDari(db, rows);
    res.json(data.filter((k) => cocok(req.query.q, k.mahasiswa.nama, k.mahasiswa.npm, k.nama_perusahaan)));
  });

  r.get('/konversi/:id', async (req, res) => {
    const rows = await q(db, `${KNV_SQL} WHERE k.id_konversi = $1 AND k.status <> 'draft'`, [Number(req.params.id)]);
    if (!rows.length) throw new Galat(404, 'Pengajuan konversi tidak ditemukan.');
    const [k] = await konversiDari(db, rows);
    res.json({ ...k, admin_pemeriksa: await namaAdmin(db, rows[0].ditetapkan_oleh ?? rows[0].diperiksa_oleh) });
  });

  const berkasKonversi = {
    'surat-penerimaan': 'SELECT n.file_surat_penerimaan AS file FROM pengajuan_konversi k JOIN penerimaan_magang n USING (id_penerimaan) WHERE k.id_konversi = $1',
    silabus: 'SELECT file_silabus AS file FROM pengajuan_konversi WHERE id_konversi = $1',
  };
  for (const [rute, sql] of Object.entries(berkasKonversi)) {
    r.get(`/konversi/:id/${rute}`, async (req, res) => {
      const d = await satu(db, sql, [Number(req.params.id)]);
      if (!d?.file) throw new Galat(404, 'Berkas tidak ditemukan.');
      kirimPdf(res, await storage.baca(d.file), `${rute}.pdf`);
    });
  }
  r.get('/konversi/:id/surat', async (req, res) => {
    const s = await satu(db, 'SELECT * FROM surat WHERE id_konversi = $1', [Number(req.params.id)]);
    if (!s) throw new Galat(404, 'Surat belum diterbitkan.');
    kirimPdf(res, await storage.baca(s.file_pdf), `${s.nomor_surat.replaceAll('/', '-')}.pdf`);
  });

  // FR-06: periksa kelengkapan. Batas dua kali magang tidak dicek lagi di sini karena sudah diperiksa saat validasi surat rekomendasi (BR-03).
  r.post('/konversi/:id/periksa', async (req, res) => {
    const lengkap = req.body?.lengkap === true;
    if (!lengkap) salah(alasanSah(req.body?.alasan));
    await db.transaksi(async (c) => {
      const k = await konversiBerstatus(c, Number(req.params.id), ['diajukan'], 'Hanya pengajuan Diajukan yang bisa diperiksa.');
      await c.query('UPDATE pengajuan_konversi SET diperiksa_oleh = $1, diperiksa_pada = now(), alasan_penolakan = $2 WHERE id_konversi = $3',
        [req.admin.id_admin, lengkap ? null : req.body.alasan.trim(), k.id_konversi]);
      await catat(c, 'pengajuan_konversi', k.id_konversi, 'diajukan', lengkap ? 'ditinjau' : 'ditolak', req.user.id_user);
    });
    res.json({ ok: true });
  });

  // FR-07: simpan pemetaan mata kuliah dan SKS. Boleh diperbaiki selama pengajuan masih ditinjau.
  r.post('/konversi/:id/hasil', async (req, res) => {
    const matkul = await q(db, 'SELECT * FROM mata_kuliah');
    salah(validasiHasilKonversi(req.body?.matkul, matkul));
    await db.transaksi(async (c) => {
      const k = await konversiBerstatus(c, Number(req.params.id), ['ditinjau'], 'Pemetaan hanya bisa disimpan saat pengajuan sedang ditinjau.');
      await c.query('DELETE FROM detail_konversi WHERE id_konversi = $1', [k.id_konversi]);
      for (const b of req.body.matkul) {
        await c.query('INSERT INTO detail_konversi (id_konversi, id_matkul, sks_diakui, keterangan) VALUES ($1, $2, $3, $4)', [k.id_konversi, Number(b.id_matkul), Number(b.sks_diakui), (b.keterangan ?? '').trim() || KETERANGAN_AWAL]);
      }
      await c.query('UPDATE pengajuan_konversi SET ditetapkan_oleh = $1, ditetapkan_pada = now() WHERE id_konversi = $2', [req.admin.id_admin, k.id_konversi]);
    });
    res.json({ ok: true });
  });

  // "Setujui Konversi": menyetujui sekaligus menerbitkan surat keterangan konversi SKS. Dosen pendamping ditetapkan terpisah (Penugasan Dosen).
  r.post('/konversi/:id/setujui', async (req, res) => {
    const nomor = await denganPembersihan((baru) => db.transaksi(async (c) => {
      const k = await konversiBerstatus(c, Number(req.params.id), ['ditinjau'], 'Hanya pengajuan yang sudah diperiksa berkasnya yang bisa disetujui.');
      const [data] = await konversiDari(c, await q(c, `${KNV_SQL} WHERE k.id_konversi = $1`, [k.id_konversi]));
      if (!data.matkul.length) throw new Galat(409, 'Simpan pemetaan mata kuliah terlebih dahulu.');
      await catat(c, 'pengajuan_konversi', k.id_konversi, 'ditinjau', 'diproses', req.user.id_user);
      const sekarang = new Date();
      const nomorSurat = await nomorSuratBerikut(c, 'konversi', 'KNV', sekarang);
      const total = data.matkul.reduce((t, m) => t + m.sks_diakui, 0);
      const pdf = await buatSuratPdf(TEMPLAT.konversi, {
        nomor_surat: nomorSurat, tahun_akademik: data.tahun_akademik ?? '', nama: data.mahasiswa.nama, npm: data.mahasiswa.npm, angkatan: angkatan(data.mahasiswa.npm),
        kegiatan: `Magang Mandiri sebagai ${data.posisi} di ${data.nama_perusahaan}, selama ${angkaTerbilang(lamaBulan(data.tgl_mulai, data.tgl_selesai))} bulan.`,
        total_sks: angkaTerbilang(total), tanggal_surat: tanggalPanjangId(sekarang),
      // Kolom SEM: SDD tidak menyimpan semester per mata kuliah, jadi diisi semester mahasiswa.
      }, data.matkul.map((m) => ({ ...m, semester: data.mahasiswa.semester })));
      const lokasi = await storage.simpan(pdf, 'surat/konversi');
      baru.push(lokasi);
      await c.query('INSERT INTO surat (jenis_surat, nomor_surat, id_konversi, id_template, file_pdf, diterbitkan_oleh) VALUES ($1, $2, $3, $4, $5, $6)',
        ['konversi', nomorSurat, k.id_konversi, await templatTerpasang(c, 'konversi'), lokasi, req.admin.id_admin]);
      await catat(c, 'pengajuan_konversi', k.id_konversi, 'diproses', 'diterbitkan', req.user.id_user);
      return nomorSurat;
    }));
    res.json({ nomor_surat: nomor });
  });

  r.post('/konversi/:id/tolak', async (req, res) => {
    salah(alasanSah(req.body?.alasan));
    await db.transaksi(async (c) => {
      const k = await konversiBerstatus(c, Number(req.params.id), ['ditinjau'], 'Hanya pengajuan yang sedang ditinjau yang bisa ditolak di tahap ini.');
      await c.query('UPDATE pengajuan_konversi SET alasan_penolakan = $1, ditetapkan_oleh = $2, ditetapkan_pada = now() WHERE id_konversi = $3', [req.body.alasan.trim(), req.admin.id_admin, k.id_konversi]);
      await catat(c, 'pengajuan_konversi', k.id_konversi, 'ditinjau', 'ditolak', req.user.id_user);
    });
    res.json({ ok: true });
  });

  // ---------- penugasan dosen (FR-11) ----------
  r.get('/penugasan/ringkasan', async (_req, res) => {
    const total = await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi WHERE status IN ('diterbitkan', 'selesai')");
    const sudah = await hitung("SELECT count(*)::int AS n FROM pengajuan_konversi k WHERE k.status IN ('diterbitkan', 'selesai') AND EXISTS (SELECT 1 FROM penugasan_dosen d WHERE d.id_konversi = k.id_konversi)");
    res.json({ total, belum: total - sudah, sudah });
  });

  r.post('/konversi/:id/dosen', async (req, res) => {
    const idDosen = Number(req.body?.id_dosen);
    if (!(await satu(db, 'SELECT 1 FROM dosen d JOIN users u USING (id_user) WHERE d.id_dosen = $1 AND u.is_aktif', [idDosen]))) throw new Galat(400, 'Pilih dosen pendamping yang aktif.');
    await db.transaksi(async (c) => {
      const k = await konversiBerstatus(c, Number(req.params.id), ['diterbitkan', 'selesai'], 'Dosen pendamping ditetapkan setelah konversi disetujui.');
      await c.query(`INSERT INTO penugasan_dosen (id_konversi, id_dosen, ditetapkan_oleh) VALUES ($1, $2, $3)
        ON CONFLICT (id_konversi) DO UPDATE SET id_dosen = EXCLUDED.id_dosen, ditetapkan_oleh = EXCLUDED.ditetapkan_oleh, ditetapkan_pada = now()`, [k.id_konversi, idDosen, req.admin.id_admin]);
    });
    res.json({ ok: true });
  });

  // ---------- monitoring magang (hanya baca) ----------
  async function dataMonitoring(c) {
    const rows = await q(c, `SELECT k.id_konversi, k.status, u.nama, m.npm, p.nama_perusahaan, n.id_penerimaan, n.tgl_mulai, n.tgl_selesai, ud.nama AS dosen
      FROM pengajuan_konversi k JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user
      LEFT JOIN penugasan_dosen pd ON pd.id_konversi = k.id_konversi LEFT JOIN dosen d ON d.id_dosen = pd.id_dosen LEFT JOIN users ud ON ud.id_user = d.id_user
      WHERE k.status IN ('diterbitkan', 'selesai') ORDER BY k.id_konversi DESC`);
    const docs = rows.length ? await q(c, 'SELECT id_penerimaan, jenis_dokumen, status_periksa FROM dokumen_akhir WHERE id_penerimaan = ANY($1::int[])', [rows.map((x) => x.id_penerimaan)]) : [];
    const data = rows.map((x) => {
      const mine = docs.filter((d) => d.id_penerimaan === x.id_penerimaan);
      const wajib = mine.filter((d) => WAJIB.includes(d.jenis_dokumen));
      const setuju = wajib.filter((d) => d.status_periksa === 'disetujui').length;
      const menunggu = mine.filter((d) => d.status_periksa === 'menunggu').length;
      return {
        id: x.id_konversi, nama: x.nama, npm: x.npm, perusahaan: x.nama_perusahaan, tgl_mulai: x.tgl_mulai, tgl_selesai: x.tgl_selesai, dosen: x.dosen,
        progres: { disetujui: setuju, total: WAJIB.length },
        status_magang: setuju === WAJIB.length ? 'selesai' : 'berjalan',
        status_dokumen: setuju === WAJIB.length ? 'selesai' : menunggu > 0 ? 'menunggu' : 'belum_lengkap',
        _unggah: wajib.length, _menunggu: menunggu, _disetujui: mine.filter((d) => d.status_periksa === 'disetujui').length,
      };
    });
    return {
      data,
      stat: {
        total: data.length,
        berjalan: data.filter((x) => x.status_magang === 'berjalan').length,
        menunggu_pengumpulan: data.filter((x) => x._unggah === 0).length,
        belum_lengkap: data.filter((x) => x._unggah < WAJIB.length).length,
        menunggu_pemeriksaan: data.reduce((t, x) => t + x._menunggu, 0),
        selesai_diperiksa: data.reduce((t, x) => t + x._disetujui, 0),
      },
    };
  }

  r.get('/monitoring', async (req, res) => {
    const { data, stat } = await dataMonitoring(db);
    const saring = data.filter((x) => cocok(req.query.q, x.nama, x.npm, x.perusahaan, x.dosen)
      && (!['berjalan', 'selesai'].includes(req.query.magang) || x.status_magang === req.query.magang)
      && (!['belum_lengkap', 'menunggu', 'selesai'].includes(req.query.dokumen) || x.status_dokumen === req.query.dokumen));
    const per = 10;
    const halaman = Math.max(1, Math.min(Number(req.query.halaman) || 1, Math.ceil(saring.length / per) || 1));
    res.json({ stat, total: saring.length, halaman, per_halaman: per, data: saring.slice((halaman - 1) * per, halaman * per).map(({ _unggah, _menunggu, _disetujui, ...x }) => x) });
  });

  async function dokumenAkhirDari(c, idPenerimaan) {
    const docs = await q(c, `SELECT d.*, u.nama AS pemeriksa FROM dokumen_akhir d LEFT JOIN dosen ds ON ds.id_dosen = d.diperiksa_oleh LEFT JOIN users u ON u.id_user = ds.id_user WHERE d.id_penerimaan = $1`, [idPenerimaan]);
    const rd = docs.length ? await q(c, 'SELECT rd.*, u.nama, u.peran FROM riwayat_dokumen rd LEFT JOIN users u ON u.id_user = rd.oleh WHERE rd.id_dokumen = ANY($1::int[]) ORDER BY rd.waktu', [docs.map((d) => d.id_dokumen)]) : [];
    return DOKUMEN_AKHIR.map((x) => {
      const d = docs.find((i) => i.jenis_dokumen === x.jenis);
      const riwayat = rd.filter((h) => h.id_dokumen === d?.id_dokumen).map((h) => ({
        judul: { diunggah: 'Dikirim mahasiswa', disetujui: 'Disetujui', perbaikan: 'Perlu perbaikan', ditandatangani: 'Ditandatangani dosen' }[h.aksi],
        pada: iso(h.waktu), oleh: h.peran === 'mahasiswa' ? 'Mahasiswa' : h.nama,
      }));
      return {
        ...x, status: d ? d.status_periksa : 'belum_diunggah', berkas: berkas(d?.nama_asli), catatan_dosen: d?.catatan_dosen ?? null,
        diunggah_pada: iso(d?.diunggah_pada) ?? null, diperiksa_pada: iso(d?.diperiksa_pada) ?? null, pemeriksa: d?.pemeriksa ?? null,
        ttd_digital: d?.ttd_digital ?? false, ada_ttd: Boolean(d?.file_ttd), ditandatangani_pada: iso(d?.ditandatangani_pada) ?? null, riwayat,
      };
    });
  }

  r.get('/monitoring/:id', async (req, res) => {
    const rows = await q(db, `${KNV_SQL} WHERE k.id_konversi = $1 AND k.status IN ('diterbitkan', 'selesai')`, [Number(req.params.id)]);
    if (!rows.length) throw new Galat(404, 'Data monitoring tidak ditemukan.');
    const [k] = await konversiDari(db, rows);
    res.json({ ...k, dokumen: await dokumenAkhirDari(db, rows[0].id_penerimaan) });
  });

  r.get('/monitoring/:id/dokumen/:jenis', async (req, res) => {
    const d = await satu(db, `SELECT d.* FROM dokumen_akhir d JOIN pengajuan_konversi k ON k.id_penerimaan = d.id_penerimaan WHERE k.id_konversi = $1 AND d.jenis_dokumen = $2`, [Number(req.params.id), req.params.jenis]);
    if (!d?.file_dokumen) throw new Galat(404, 'Berkas tidak ditemukan.');
    kirimPdf(res, await storage.baca(d.file_dokumen), d.nama_asli);
  });

  // ---------- mata kuliah dan dosen (bahan FR-07 dan FR-11) ----------
  r.get('/mata-kuliah', async (_req, res) => res.json(await q(db, 'SELECT id_matkul AS id, kode_mk, nama_mk, sks FROM mata_kuliah ORDER BY kode_mk')));

  r.post('/mata-kuliah', async (req, res) => {
    salah(validasiMataKuliah(req.body ?? {}));
    try {
      const m = await satu(db, 'INSERT INTO mata_kuliah (kode_mk, nama_mk, sks) VALUES ($1, $2, $3) RETURNING id_matkul AS id, kode_mk, nama_mk, sks', [req.body.kode_mk.trim().toUpperCase(), req.body.nama_mk.trim(), Number(req.body.sks)]);
      res.status(201).json(m);
    } catch (e) {
      if (e.code === '23505') throw new Galat(409, 'Kode mata kuliah sudah ada.');
      throw e;
    }
  });

  r.delete('/mata-kuliah/:id', async (req, res) => {
    try {
      const h = await satu(db, 'DELETE FROM mata_kuliah WHERE id_matkul = $1 RETURNING id_matkul', [Number(req.params.id)]);
      if (!h) throw new Galat(404, 'Mata kuliah tidak ditemukan.');
      res.json({ ok: true });
    } catch (e) {
      if (e.code === '23503') throw new Galat(409, 'Mata kuliah sudah dipakai pada hasil konversi, jadi tidak bisa dihapus.');
      throw e;
    }
  });

  const DOSEN_SQL = `SELECT d.id_dosen AS id, u.id_user, u.nama, d.nidn, u.email, d.no_telepon, u.is_aktif,
      COALESCE((SELECT array_agg(um.nama ORDER BY um.nama) FROM penugasan_dosen p JOIN pengajuan_konversi k ON k.id_konversi = p.id_konversi JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan
        JOIN pengajuan_rekomendasi pr ON pr.id_pengajuan = n.id_pengajuan JOIN mahasiswa m ON m.id_mahasiswa = pr.id_mahasiswa JOIN users um ON um.id_user = m.id_user WHERE p.id_dosen = d.id_dosen), '{}') AS bimbingan
    FROM dosen d JOIN users u USING (id_user)`;

  r.get('/dosen', async (_req, res) => res.json((await q(db, `${DOSEN_SQL} WHERE u.is_aktif ORDER BY u.nama`)).map((d) => ({ ...d, bimbingan: d.bimbingan.length }))));

  // ---------- manajemen akun ----------
  r.get('/akun/dosen', async (req, res) => {
    const rows = await q(db, `${DOSEN_SQL} ORDER BY u.nama`);
    res.json(rows.filter((d) => cocok(req.query.q, d.nama, d.nidn, d.email) && (!['aktif', 'nonaktif'].includes(req.query.status) || d.is_aktif === (req.query.status === 'aktif'))));
  });

  r.post('/akun/dosen', async (req, res) => {
    const b = req.body ?? {};
    salah(validasiAkunDosen(b));
    const email = b.email.trim().toLowerCase();
    if (await satu(db, 'SELECT 1 FROM users WHERE email = $1', [email])) throw new Galat(409, 'Email sudah terdaftar.');
    if (await satu(db, 'SELECT 1 FROM dosen WHERE nidn = $1', [b.nidn.trim()])) throw new Galat(409, 'NIDN sudah terdaftar.');
    let authId;
    try {
      authId = await akun.buat({ email, password: b.password, nama: b.nama.trim() });
    } catch (e) {
      if (e.message === 'EMAIL_ADA') throw new Galat(409, 'Email sudah terdaftar.');
      throw e;
    }
    try {
      await db.transaksi(async (c) => {
        const u = await satu(c, "INSERT INTO users (auth_id, email, nama, peran) VALUES ($1, $2, $3, 'dosen') RETURNING id_user", [authId, email, b.nama.trim()]);
        await c.query('INSERT INTO dosen (id_user, nidn, no_telepon) VALUES ($1, $2, $3)', [u.id_user, b.nidn.trim(), b.no_telepon]);
      });
    } catch (e) {
      await akun.hapus(authId); // jangan tinggalkan akun login tanpa profil
      throw e;
    }
    res.status(201).json({ ok: true });
  });

  r.put('/akun/:idUser/aktif', async (req, res) => {
    const idUser = Number(req.params.idUser);
    if (typeof req.body?.aktif !== 'boolean') throw new Galat(400, 'Status akun tidak valid.');
    if (idUser === req.user.id_user) throw new Galat(409, 'Anda tidak dapat menonaktifkan akun sendiri.');
    const u = await satu(db, "UPDATE users SET is_aktif = $1 WHERE id_user = $2 AND peran IN ('dosen', 'mahasiswa') RETURNING id_user", [req.body.aktif, idUser]);
    if (!u) throw new Galat(404, 'Akun tidak ditemukan.');
    res.json({ ok: true });
  });

  // ---------- periode (FR-09) ----------
  function statusTampil(p) {
    if (p.status === 'draft') return 'draft';
    const akhir = [p.tgl_tutup, p.batas_konversi, p.batas_laporan].filter(Boolean).sort().at(-1);
    return hariIni() > akhir ? 'selesai' : 'aktif';
  }
  const periodeDari = (p) => ({ ...p, jadwal: jadwal(p), status_tampil: statusTampil(p) });
  const kolomPeriode = (b) => [
    b.tahun_akademik.trim(), Number(b.gelombang), b.tgl_buka, b.tgl_tutup, b.tgl_pengumuman || null, b.tgl_mulai_pelaksanaan || null, b.tgl_selesai_pelaksanaan || null,
    b.tgl_buka_konversi || null, b.batas_konversi || null, b.tgl_buka_dokumen || null, b.batas_laporan || null, b.ketentuan?.trim() || null,
    b.nama_periode.trim(), b.deskripsi?.trim() || null, b.status ?? 'dipublikasikan', Number(b.min_semester ?? 5), Number(b.min_ipk ?? 3), b.semester,
  ];
  const KOLOM = 'tahun_akademik, gelombang, tgl_buka, tgl_tutup, tgl_pengumuman, tgl_mulai_pelaksanaan, tgl_selesai_pelaksanaan, tgl_buka_konversi, batas_konversi, tgl_buka_dokumen, batas_laporan, ketentuan, nama_periode, deskripsi, status, min_semester, min_ipk, semester';

  r.get('/periode', async (req, res) => {
    const semua = (await q(db, 'SELECT * FROM periode_magang ORDER BY id_periode DESC')).map(periodeDari);
    res.json(semua.filter((p) => cocok(req.query.q, p.tahun_akademik, p.nama_periode) && (!['aktif', 'draft', 'selesai'].includes(req.query.status) || p.status_tampil === req.query.status)));
  });

  r.get('/periode/:id', async (req, res) => {
    const p = await satu(db, 'SELECT * FROM periode_magang WHERE id_periode = $1', [Number(req.params.id)]);
    if (!p) throw new Galat(404, 'Periode tidak ditemukan.');
    res.json({
      ...periodeDari(p),
      mengajukan: await hitung("SELECT count(DISTINCT id_mahasiswa)::int AS n FROM pengajuan_rekomendasi WHERE id_periode = $1 AND status <> 'draft'", [p.id_periode]),
      diproses: await hitung("SELECT count(*)::int AS n FROM pengajuan_rekomendasi WHERE id_periode = $1 AND status IN ('disetujui', 'diterbitkan', 'ditolak')", [p.id_periode]),
    });
  });

  r.post('/periode', async (req, res) => {
    salah(validasiPeriode(req.body ?? {}));
    const p = await satu(db, `INSERT INTO periode_magang (${KOLOM}, dibuat_oleh) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`, [...kolomPeriode(req.body), req.admin.id_admin]);
    res.status(201).json(periodeDari(p));
  });

  r.put('/periode/:id', async (req, res) => {
    salah(validasiPeriode(req.body ?? {}));
    const set = KOLOM.split(', ').map((k, i) => `${k} = $${i + 1}`).join(', ');
    const p = await satu(db, `UPDATE periode_magang SET ${set} WHERE id_periode = $19 RETURNING *`, [...kolomPeriode(req.body), Number(req.params.id)]);
    if (!p) throw new Galat(404, 'Periode tidak ditemukan.');
    res.json(periodeDari(p));
  });

  r.post('/periode/:id/status', async (req, res) => {
    if (!['draft', 'dipublikasikan'].includes(req.body?.status)) throw new Galat(400, 'Status periode tidak valid.');
    const p = await satu(db, 'UPDATE periode_magang SET status = $1 WHERE id_periode = $2 RETURNING *', [req.body.status, Number(req.params.id)]);
    if (!p) throw new Galat(404, 'Periode tidak ditemukan.');
    res.json(periodeDari(p));
  });

  return r;
}
