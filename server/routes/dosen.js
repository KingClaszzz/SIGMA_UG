// Rute Dosen Pendamping (/api/dosen). Dosen hanya melihat mahasiswa yang ditugaskan admin kepadanya (penugasan_dosen):
// memantau dokumen akhir, memeriksa (setujui / minta perbaikan), dan mengesahkan laporan akhir (FR-14, FR-15).
import express from 'express';
import { Galat, catat, iso, kirimPdf, q, salah, satu } from '../lib.js';
import { DOKUMEN_AKHIR, alasanSah, hariIni, pernahPerbaikan, tanggalSah, validasiPdf } from '../rules.js';
import { bubuhiTandaTangan } from '../ttd.js';

const WAJIB = DOKUMEN_AKHIR.filter((d) => d.wajib).map((d) => d.jenis);
const LABEL = Object.fromEntries(DOKUMEN_AKHIR.map((d) => [d.jenis, d.label]));
const LABEL_PENDEK = { laporan_akhir: 'Laporan Akhir', nilai_mitra: 'Nilai Akhir Mitra', sertifikat: 'Sertifikat Magang', logbook: 'Logbook' };
const pdf = express.raw({ type: 'application/pdf', limit: '2mb' });

// belum_diunggah | menunggu | menunggu_ulang | perlu_perbaikan | disetujui
const statusDok = (d) => (!d ? 'belum_diunggah' : d.status_periksa === 'menunggu' && d.pernah_perbaikan ? 'menunggu_ulang' : d.status_periksa);
const jenisSah = (j) => {
  if (!LABEL[j]) throw new Galat(404, 'Jenis dokumen tidak dikenal.');
  return j;
};
const kecil = (s) => `${s ?? ''}`.toLowerCase();

export default function routerDosen({ db, storage }) {
  const r = express.Router();

  r.use(async (req, _res, next) => {
    req.dosen = await satu(db, 'SELECT d.*, u.nama, u.email FROM dosen d JOIN users u USING (id_user) WHERE d.id_user = $1', [req.user.id_user]);
    if (!req.dosen) throw new Galat(403, 'Profil dosen belum dibuat. Hubungi Admin Prodi.');
    next();
  });

  const periodeTerbaru = () => satu(db, "SELECT * FROM periode_magang WHERE status = 'dipublikasikan' ORDER BY id_periode DESC LIMIT 1");

  // Satu baris per mahasiswa bimbingan, lengkap dengan dokumennya.
  async function bimbingan(req, idKonversi = null) {
    const rows = await q(db, `SELECT k.id_konversi AS id, k.status AS status_konversi, n.id_penerimaan, n.posisi, n.tgl_mulai, n.tgl_selesai, p.nama_perusahaan, p.alamat_perusahaan, pr.tahun_akademik,
        m.npm, m.semester, m.no_telepon, u.nama, u.email, pd.ditetapkan_pada
      FROM penugasan_dosen pd JOIN pengajuan_konversi k ON k.id_konversi = pd.id_konversi JOIN penerimaan_magang n ON n.id_penerimaan = k.id_penerimaan
      JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan LEFT JOIN periode_magang pr ON pr.id_periode = p.id_periode
      JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user
      WHERE pd.id_dosen = $1 AND ($2::int IS NULL OR k.id_konversi = $2) ORDER BY pd.ditetapkan_pada DESC`, [req.dosen.id_dosen, idKonversi]);
    const docs = rows.length ? await q(db, `SELECT *, ${pernahPerbaikan('dokumen_akhir')} FROM dokumen_akhir WHERE id_penerimaan = ANY($1::int[])`, [rows.map((x) => x.id_penerimaan)]) : [];
    return rows.map((x) => {
      const mine = docs.filter((d) => d.id_penerimaan === x.id_penerimaan);
      const setuju = mine.filter((d) => WAJIB.includes(d.jenis_dokumen) && d.status_periksa === 'disetujui').length;
      return {
        ...x, ditetapkan_pada: iso(x.ditetapkan_pada), docs: mine, menunggu: mine.filter((d) => d.status_periksa === 'menunggu').length,
        progres: { disetujui: setuju, total: WAJIB.length }, status_magang: setuju === WAJIB.length ? 'selesai' : 'berjalan',
      };
    });
  }
  const ringkas = ({ docs, id_penerimaan, ...x }) => x;
  const cari = (req) => bimbingan(req, Number(req.params.id)).then(([b]) => {
    if (!b) throw new Galat(404, 'Mahasiswa bimbingan tidak ditemukan.');
    return b;
  });
  const dokumenDari = (b, jenis) => b.docs.find((d) => d.jenis_dokumen === jenis);

  // ---------- profil ----------
  r.get('/profil', (req, res) => res.json({ nama: req.dosen.nama, nidn: req.dosen.nidn, email: req.dosen.email, no_telepon: req.dosen.no_telepon }));

  r.put('/profil', async (req, res) => {
    if (!/^08\d{8,11}$/.test(req.body?.no_telepon ?? '')) throw new Galat(400, 'Nomor telepon harus 10–13 digit dan diawali 08.');
    await db.query('UPDATE dosen SET no_telepon = $1 WHERE id_dosen = $2', [req.body.no_telepon, req.dosen.id_dosen]);
    res.json({ ok: true });
  });

  // ---------- dasbor ----------
  r.get('/dashboard', async (req, res) => {
    const semua = await bimbingan(req);
    const docs = semua.flatMap((b) => b.docs.map((d) => ({ ...d, b })));
    const menunggu = docs.filter((d) => d.status_periksa === 'menunggu').sort((a, b) => new Date(b.diunggah_pada) - new Date(a.diunggah_pada));
    const periode = await periodeTerbaru();
    const revisi = docs.filter((d) => d.status_periksa === 'perlu_perbaikan' && d.batas_revisi && d.batas_revisi >= hariIni()).map((d) => d.batas_revisi).sort()[0] ?? null;
    res.json({
      ringkasan: {
        bimbingan: semua.length,
        logbook_menunggu: menunggu.filter((d) => d.jenis_dokumen === 'logbook').length,
        laporan_menunggu: menunggu.filter((d) => d.jenis_dokumen === 'laporan_akhir').length,
        perlu_perbaikan: docs.filter((d) => d.status_periksa === 'perlu_perbaikan').length,
      },
      aktivitas: menunggu.slice(0, 5).map((d) => ({ id: d.b.id, jenis: d.jenis_dokumen, nama: d.b.nama, npm: d.b.npm, dokumen: LABEL_PENDEK[d.jenis_dokumen], pada: iso(d.diunggah_pada), status: statusDok(d) })),
      jadwal: { batas_pemeriksaan: periode?.batas_laporan ?? null, batas_revisi: revisi, akhir_magang: semua.map((b) => b.tgl_selesai).sort().at(-1) ?? null },
      terbaru: semua.slice(0, 3).map((b) => ({ id: b.id, nama: b.nama, npm: b.npm })),
    });
  });

  // ---------- notifikasi (lonceng) ----------
  r.get('/notifikasi', async (req, res) => {
    const sejak = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const kirim = await q(db, `SELECT rd.waktu, d.jenis_dokumen, ${pernahPerbaikan('d')}, k.id_konversi AS id, u.nama FROM riwayat_dokumen rd JOIN dokumen_akhir d USING (id_dokumen)
      JOIN pengajuan_konversi k ON k.id_penerimaan = d.id_penerimaan JOIN penugasan_dosen pd ON pd.id_konversi = k.id_konversi
      JOIN penerimaan_magang n ON n.id_penerimaan = d.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user
      WHERE pd.id_dosen = $1 AND rd.aksi = 'diunggah' AND rd.waktu > $2`, [req.dosen.id_dosen, sejak]);
    const baru = (await bimbingan(req)).filter((b) => b.ditetapkan_pada > sejak);
    const item = [
      ...kirim.map((x) => ({ judul: x.pernah_perbaikan ? 'Pengiriman dokumen revisi' : `Pengiriman ${LABEL_PENDEK[x.jenis_dokumen].toLowerCase()} baru`, nama: x.nama, waktu: x.waktu, to: `/dosen/monitoring/${x.id}/${x.jenis_dokumen}` })),
      ...baru.map((b) => ({ judul: 'Penugasan mahasiswa baru', nama: `${b.nama} ditugaskan sebagai bimbingan Anda`, waktu: b.ditetapkan_pada, to: `/dosen/bimbingan/${b.id}` })),
    ];
    const periode = await periodeTerbaru();
    if (periode?.batas_laporan) {
      const sisa = Math.round((Date.parse(periode.batas_laporan) - Date.parse(hariIni())) / 86_400_000);
      if (sisa >= 0 && sisa <= 3) item.push({ judul: 'Pengingat tenggat pemeriksaan', nama: `Tenggat pemeriksaan ${sisa === 0 ? 'hari ini' : `${sisa} hari lagi`}`, waktu: new Date(`${hariIni()}T00:00:00Z`), to: '/dosen/monitoring' });
    }
    const dibaca = new Date(req.dosen.notif_dibaca_pada);
    const semua = item.map((x) => ({ ...x, waktu: iso(x.waktu), baru: new Date(x.waktu) > dibaca })).sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
    res.json({ belum_dibaca: semua.filter((x) => x.baru).length, item: semua.slice(0, 10) });
  });

  r.post('/notifikasi/baca', async (req, res) => {
    await db.query('UPDATE dosen SET notif_dibaca_pada = now() WHERE id_dosen = $1', [req.dosen.id_dosen]);
    res.json({ ok: true });
  });

  // ---------- mahasiswa bimbingan ----------
  r.get('/bimbingan', async (req, res) => {
    const magang = ['berjalan', 'selesai'].includes(req.query.magang) ? req.query.magang : null;
    res.json((await bimbingan(req)).filter((x) => `${kecil(x.nama)} ${kecil(x.npm)}`.includes(kecil(req.query.q).trim()) && (!magang || x.status_magang === magang)).map(ringkas));
  });

  const JUDUL_RIWAYAT = { diunggah: 'Dikirim mahasiswa', disetujui: 'Disetujui', perbaikan: 'Perlu perbaikan', ditandatangani: 'Ditandatangani' };
  const RIWAYAT_SQL = `SELECT rd.aksi, rd.waktu, rd.catatan, d.jenis_dokumen, d.id_penerimaan, uo.nama AS oleh, uo.peran
    FROM riwayat_dokumen rd JOIN dokumen_akhir d USING (id_dokumen) LEFT JOIN users uo ON uo.id_user = rd.oleh`;
  const riwayatItem = (x) => ({ judul: `${JUDUL_RIWAYAT[x.aksi]} (${LABEL_PENDEK[x.jenis_dokumen]})`, pada: iso(x.waktu), oleh: x.peran === 'mahasiswa' ? 'Mahasiswa' : x.oleh, catatan: x.catatan });

  r.get('/bimbingan/:id', async (req, res) => {
    const b = await cari(req);
    const matkul = b.status_konversi === 'diajukan' ? [] : await q(db, 'SELECT m.kode_mk, m.nama_mk, d.sks_diakui FROM detail_konversi d JOIN mata_kuliah m USING (id_matkul) WHERE d.id_konversi = $1 ORDER BY d.id_detail', [b.id]);
    const surat = await satu(db, 'SELECT nomor_surat FROM surat WHERE id_konversi = $1', [b.id]);
    const aktivitas = (await q(db, `${RIWAYAT_SQL} WHERE d.id_penerimaan = $1 ORDER BY rd.waktu`, [b.id_penerimaan])).map(riwayatItem);
    if (b.tgl_mulai <= hariIni()) aktivitas.unshift({ judul: 'Mahasiswa mulai magang', pada: b.tgl_mulai, oleh: null });
    res.json({
      ...ringkas(b),
      konversi: { status: b.status_konversi, matkul, total_sks: matkul.reduce((t, x) => t + x.sks_diakui, 0), nomor_surat: surat?.nomor_surat ?? null },
      dokumen: DOKUMEN_AKHIR.map((x) => {
        const d = dokumenDari(b, x.jenis);
        return { ...x, status: statusDok(d), diunggah_pada: iso(d?.diunggah_pada) ?? null, diperiksa_pada: iso(d?.diperiksa_pada) ?? null };
      }),
      aktivitas,
    });
  });

  r.get('/bimbingan/:id/surat', async (req, res) => {
    const b = await cari(req);
    const s = await satu(db, 'SELECT * FROM surat WHERE id_konversi = $1', [b.id]);
    if (!s) throw new Galat(404, 'Surat konversi belum diterbitkan.');
    kirimPdf(res, await storage.baca(s.file_pdf), `${s.nomor_surat.replaceAll('/', '-')}.pdf`);
  });

  r.get('/bimbingan/:id/dokumen/:jenis', async (req, res) => {
    const d = dokumenDari(await cari(req), jenisSah(req.params.jenis));
    if (!d?.file_dokumen) throw new Galat(404, 'Berkas belum tersedia.');
    kirimPdf(res, await storage.baca(d.file_dokumen), d.nama_asli);
  });

  // ---------- monitoring magang (per jenis dokumen) ----------
  r.get('/monitoring', async (req, res) => {
    const jenis = jenisSah(req.query.jenis ?? 'logbook');
    const status = ['belum_diunggah', 'menunggu', 'menunggu_ulang', 'perlu_perbaikan', 'disetujui'].includes(req.query.status) ? req.query.status : null;
    const kata = kecil(req.query.q).trim();
    res.json((await bimbingan(req)).map((b) => {
      const d = dokumenDari(b, jenis);
      return { id: b.id, nama: b.nama, npm: b.npm, nama_perusahaan: b.nama_perusahaan, jenis, status: statusDok(d), nama_berkas: d?.nama_asli ?? null, diunggah_pada: iso(d?.diunggah_pada) ?? null };
    }).filter((x) => `${kecil(x.nama)} ${kecil(x.npm)}`.includes(kata) && (!status || x.status === status)));
  });

  r.get('/monitoring/:id/:jenis', async (req, res) => {
    const jenis = jenisSah(req.params.jenis);
    const b = await cari(req);
    const d = dokumenDari(b, jenis);
    const riwayat = d ? (await q(db, `${RIWAYAT_SQL} WHERE d.id_dokumen = $1 ORDER BY rd.waktu`, [d.id_dokumen])).map(riwayatItem) : [];
    res.json({
      id: b.id, jenis, label: LABEL[jenis], wajib: DOKUMEN_AKHIR.find((x) => x.jenis === jenis).wajib,
      mahasiswa: { nama: b.nama, npm: b.npm, email: b.email }, nama_perusahaan: b.nama_perusahaan, tgl_mulai: b.tgl_mulai, tgl_selesai: b.tgl_selesai,
      status: statusDok(d), nama_berkas: d?.nama_asli ?? null, ada_berkas: !!d?.file_dokumen, catatan_dosen: d?.catatan_dosen ?? null,
      batas_revisi: d?.batas_revisi ?? null, diunggah_pada: iso(d?.diunggah_pada) ?? null, diperiksa_pada: iso(d?.diperiksa_pada) ?? null, riwayat,
      ttd: jenis === 'laporan_akhir' ? { ada: !!d?.file_ttd, nama_berkas: d?.nama_ttd ?? null, pada: iso(d?.ditandatangani_pada) ?? null } : null,
      penandatangan: { nama: req.dosen.nama, nidn: req.dosen.nidn, jabatan: 'Dosen Pendamping', prodi: 'Sistem Informasi' },
    });
  });

  r.get('/riwayat', async (req, res) => {
    const rows = await q(db, `${RIWAYAT_SQL.replace('d.id_penerimaan,', 'd.id_penerimaan, u.nama AS mahasiswa, m.npm, k.id_konversi AS id,')}
      JOIN pengajuan_konversi k ON k.id_penerimaan = d.id_penerimaan JOIN penugasan_dosen pd ON pd.id_konversi = k.id_konversi
      JOIN penerimaan_magang n ON n.id_penerimaan = d.id_penerimaan JOIN pengajuan_rekomendasi p ON p.id_pengajuan = n.id_pengajuan
      JOIN mahasiswa m ON m.id_mahasiswa = p.id_mahasiswa JOIN users u ON u.id_user = m.id_user
      WHERE pd.id_dosen = $1 ORDER BY rd.waktu DESC LIMIT 200`, [req.dosen.id_dosen]);
    res.json(rows.map((x) => ({ ...riwayatItem(x), id: x.id, jenis: x.jenis_dokumen, mahasiswa: x.mahasiswa, npm: x.npm })));
  });

  // ---------- pemeriksaan ----------
  // Setujui, atau minta perbaikan (catatan wajib, batas revisi opsional). Hanya dokumen yang menunggu pemeriksaan.
  r.post('/bimbingan/:id/dokumen/:jenis/periksa', async (req, res) => {
    const setuju = req.body?.setuju === true;
    const batas = req.body?.batas_revisi || null;
    if (!setuju) salah(alasanSah(req.body?.catatan)?.replace('penolakan', 'perbaikan'));
    if (batas && (!tanggalSah(batas) || batas < hariIni())) throw new Galat(400, 'Batas revisi harus berupa tanggal hari ini atau setelahnya.');
    const b = await cari(req);
    const d = dokumenDari(b, jenisSah(req.params.jenis));
    if (!d) throw new Galat(404, 'Dokumen belum diunggah mahasiswa.');
    await db.transaksi(async (c) => {
      const hasil = await satu(c, `UPDATE dokumen_akhir SET status_periksa = $1, catatan_dosen = $2, batas_revisi = $3,
          diperiksa_oleh = $4, diperiksa_pada = now() WHERE id_dokumen = $5 AND status_periksa = 'menunggu' RETURNING id_dokumen`,
      [setuju ? 'disetujui' : 'perlu_perbaikan', setuju ? null : req.body.catatan.trim(), setuju ? null : batas, req.dosen.id_dosen, d.id_dokumen]);
      if (!hasil) throw new Galat(409, 'Dokumen ini sudah diperiksa. Tunggu mahasiswa mengunggah ulang.');
      await c.query('INSERT INTO riwayat_dokumen (id_dokumen, aksi, oleh, catatan) VALUES ($1, $2, $3, $4)', [d.id_dokumen, setuju ? 'disetujui' : 'perbaikan', req.user.id_user, setuju ? null : req.body.catatan.trim()]);
      if (setuju) {
        const { n: disetujui } = await satu(c, "SELECT count(*)::int AS n FROM dokumen_akhir WHERE id_penerimaan = $1 AND jenis_dokumen = ANY($2::text[]) AND status_periksa = 'disetujui'", [b.id_penerimaan, WAJIB]);
        if (disetujui === WAJIB.length) {
          await c.query("UPDATE penerimaan_magang SET status = 'selesai' WHERE id_penerimaan = $1 AND status <> 'selesai'", [b.id_penerimaan]);
          const k = await satu(c, 'SELECT id_konversi, status FROM pengajuan_konversi WHERE id_penerimaan = $1 FOR UPDATE', [b.id_penerimaan]);
          if (k?.status === 'diterbitkan') await catat(c, 'pengajuan_konversi', k.id_konversi, 'diterbitkan', 'selesai', req.user.id_user);
        }
      }
    });
    res.json({ ok: true });
  });

  // ---------- pengesahan laporan akhir (FR-15) ----------
  async function laporanSiapTtd(req) {
    const b = await cari(req);
    const d = dokumenDari(b, 'laporan_akhir');
    if (!d?.file_dokumen || d.status_periksa !== 'disetujui') throw new Galat(409, 'Laporan akhir harus disetujui terlebih dahulu sebelum ditandatangani.');
    if (d.file_ttd) throw new Galat(409, 'Laporan ini sudah ditandatangani.');
    return { b, d };
  }
  async function simpanTtd(req, buffer, nama, digital = false) {
    const { d } = await laporanSiapTtd(req);
    const lokasi = await storage.simpan(buffer, `dosen/${req.dosen.id_dosen}/laporan-ttd`);
    try {
      await db.transaksi(async (c) => {
        await c.query('UPDATE dokumen_akhir SET file_ttd = $1, nama_ttd = $2, ttd_digital = $3, ditandatangani_pada = now() WHERE id_dokumen = $4', [lokasi, nama, digital, d.id_dokumen]);
        await c.query("INSERT INTO riwayat_dokumen (id_dokumen, aksi, oleh) VALUES ($1, 'ditandatangani', $2)", [d.id_dokumen, req.user.id_user]);
      });
    } catch (e) {
      await storage.hapus(lokasi);
      throw e;
    }
  }

  r.post('/bimbingan/:id/laporan/tanda-tangan', async (req, res) => {
    const { b, d } = await laporanSiapTtd(req);
    const asli = await storage.baca(d.file_dokumen);
    let hasil;
    try {
      hasil = await bubuhiTandaTangan(asli, { nama: req.dosen.nama, nidn: req.dosen.nidn });
    } catch {
      throw new Galat(422, 'Berkas laporan tidak dapat ditandatangani secara digital. Gunakan opsi unggah PDF bertanda tangan.');
    }
    await simpanTtd(req, hasil.buffer, `Laporan_Akhir_${b.npm}_ditandatangani.pdf`, true);
    res.json({ ok: true, id_verifikasi: hasil.sidik.slice(0, 16) });
  });

  // Alternatif di luar sistem: dosen mengunggah PDF yang sudah ditandatangani sendiri.
  r.post('/bimbingan/:id/laporan/ttd-unggah', pdf, async (req, res) => {
    salah(validasiPdf(req.body));
    const b = await cari(req);
    let nama = 'ditandatangani.pdf';
    try { nama = decodeURIComponent(req.get('x-filename') ?? nama).slice(0, 120); } catch { /* nama bawaan */ }
    await simpanTtd(req, req.body, nama || `Laporan_Akhir_${b.npm}_ditandatangani.pdf`);
    res.json({ ok: true });
  });

  r.get('/bimbingan/:id/laporan/ttd', async (req, res) => {
    const d = dokumenDari(await cari(req), 'laporan_akhir');
    if (!d?.file_ttd) throw new Galat(404, 'Laporan bertanda tangan belum tersedia.');
    kirimPdf(res, await storage.baca(d.file_ttd), d.nama_ttd);
  });

  return r;
}
