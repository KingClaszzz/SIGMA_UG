import test from 'node:test';
import assert from 'node:assert/strict';
import { buatApp } from '../app.js';
import { PDFDocument } from 'pdf-lib';
import { buatDbUji, storageUji } from './dbUji.js';

const db = await buatDbUji();
const storage = storageUji();
const identitas = {};
const server = buatApp({ db, storage, verifikasi: async (t) => identitas[t] ?? null }).listen(0);
test.after(() => server.close());

async function req(token, method, rute, body) {
  const pdf = body?.pdf;
  const res = await fetch(`http://localhost:${server.address().port}/api${rute}`, {
    method, headers: { Authorization: `Bearer ${token}`, ...(pdf ? { 'Content-Type': 'application/pdf', 'X-Filename': 'ulang.pdf' } : body && { 'Content-Type': 'application/json' }) }, body: pdf ? PDF_UJI : body && JSON.stringify(body),
  });
  const json = (res.headers.get('content-type') ?? '').includes('json');
  return { status: res.status, data: json ? await res.json() : await res.arrayBuffer() };
}
const DSN = (m, r, b) => req('t-dosen', m, `/dosen${r}`, b);

const PDF_ASLI = Buffer.from(await (async () => { const d = await PDFDocument.create(); d.addPage(); return d.save(); })()); // PDF sah untuk uji tanda tangan
const PDF_UJI = PDF_ASLI;
let n = 0;
async function akun(token, peran) {
  const auth_id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  identitas[token] = { auth_id, email: `${token}@uji.test`, nama: token };
  const { rows: [u] } = await db.query('INSERT INTO users (auth_id, email, nama, peran) VALUES ($1, $2, $3, $4) RETURNING id_user', [auth_id, `${token}@uji.test`, token, peran]);
  return u.id_user;
}
// Satu mahasiswa dengan konversi diterbitkan; `dosen` = id_dosen yang ditugaskan (atau null).
async function bimbing(token, npm, idDosen) {
  const idUser = await akun(token, 'mahasiswa');
  const { rows: [m] } = await db.query(`INSERT INTO mahasiswa (id_user, npm, ipk, semester, no_telepon, status_aktif, status_cuti, ada_nilai_e, status_verifikasi)
    VALUES ($1, $2, 3.5, 7, '081200000000', true, false, false, 'terverifikasi') RETURNING id_mahasiswa`, [idUser, npm]);
  const { rows: [p] } = await db.query(`INSERT INTO pengajuan_rekomendasi (id_mahasiswa, id_kategori, nama_perusahaan, kepada, alamat_perusahaan, tgl_mulai, tgl_selesai, status)
    VALUES ($1, 2, 'PT Uji', 'HRD', 'Depok', '2027-01-04', '2027-04-02', 'diterbitkan') RETURNING id_pengajuan`, [m.id_mahasiswa]);
  const { rows: [pen] } = await db.query(`INSERT INTO penerimaan_magang (id_pengajuan, posisi, tgl_mulai, tgl_selesai, file_surat_penerimaan, pilih_konversi, status)
    VALUES ($1, 'Dev', '2027-01-04', '2027-04-02', 'x.pdf', true, 'diterima_perusahaan') RETURNING id_penerimaan`, [p.id_pengajuan]);
  const { rows: [k] } = await db.query("INSERT INTO pengajuan_konversi (id_penerimaan, file_silabus, status) VALUES ($1, 's.pdf', 'diterbitkan') RETURNING id_konversi", [pen.id_penerimaan]);
  if (idDosen) await db.query('INSERT INTO penugasan_dosen (id_konversi, id_dosen) VALUES ($1, $2)', [k.id_konversi, idDosen]);
  return { idKonversi: k.id_konversi, idPenerimaan: pen.id_penerimaan };
}
async function dokumen(idPenerimaan, jenis) {
  const lokasi = await storage.simpan(jenis === 'laporan_akhir' ? PDF_ASLI : Buffer.from('%PDF-1.4 uji'), 'uji');
  const { rows: [d] } = await db.query("INSERT INTO dokumen_akhir (id_penerimaan, jenis_dokumen, file_dokumen, nama_asli) VALUES ($1, $2, $3, $4) RETURNING id_dokumen", [idPenerimaan, jenis, lokasi, `${jenis}.pdf`]);
  await db.query("INSERT INTO riwayat_dokumen (id_dokumen, aksi) VALUES ($1, 'diunggah')", [d.id_dokumen]);
}

const idDosenUser = await akun('t-dosen', 'dosen');
const { rows: [dosen] } = await db.query("INSERT INTO dosen (id_user, nidn, no_telepon) VALUES ($1, '0312088501', '081200000002') RETURNING id_dosen", [idDosenUser]);
await akun('t-dosen-kosong', 'dosen'); // peran dosen tanpa profil
const idLain = await akun('t-dosen-lain', 'dosen');
const { rows: [lain] } = await db.query("INSERT INTO dosen (id_user, nidn, no_telepon) VALUES ($1, '0312088502', '081200000003') RETURNING id_dosen", [idLain]);
const mine = await bimbing('t-a', '11120001', dosen.id_dosen);
const bukan = await bimbing('t-b', '11120002', lain.id_dosen);
await akun('t-admin', 'admin');

test('hanya dosen dengan profil yang boleh masuk', async () => {
  assert.equal((await req('t-a', 'GET', '/dosen/dashboard')).status, 403);
  assert.equal((await req('t-admin', 'GET', '/dosen/dashboard')).status, 403);
  assert.equal((await req('t-dosen-kosong', 'GET', '/dosen/dashboard')).status, 403);
  assert.equal((await DSN('GET', '/dashboard')).status, 200);
});

test('dosen hanya melihat mahasiswa bimbingannya', async () => {
  const daftar = (await DSN('GET', '/bimbingan')).data;
  assert.deepEqual(daftar.map((x) => x.npm), ['11120001']);
  assert.equal((await DSN('GET', `/bimbingan/${bukan.idKonversi}`)).status, 404);
  assert.equal((await DSN('GET', `/bimbingan/${mine.idKonversi}/dokumen/laporan_akhir`)).status, 404); // belum diunggah
  assert.equal((await DSN('POST', `/bimbingan/${bukan.idKonversi}/dokumen/laporan_akhir/periksa`, { setuju: true })).status, 404);
  assert.deepEqual((await DSN('GET', `/bimbingan/${mine.idKonversi}`)).data.dokumen.map((d) => d.status), ['belum_diunggah', 'belum_diunggah', 'belum_diunggah', 'belum_diunggah']);
});

test('periksa dokumen: perbaikan wajib catatan, ulang, setujui, tidak bisa diperiksa dua kali', async () => {
  await dokumen(mine.idPenerimaan, 'laporan_akhir');
  await dokumen(mine.idPenerimaan, 'sertifikat');
  const dash = (await DSN('GET', '/dashboard')).data;
  assert.deepEqual(dash.ringkasan, { bimbingan: 1, logbook_menunggu: 0, laporan_menunggu: 1, perlu_perbaikan: 0 });
  assert.equal(dash.aktivitas.length, 2);
  assert.equal((await DSN('GET', `/bimbingan/${mine.idKonversi}/dokumen/laporan_akhir`)).status, 200);
  assert.equal((await DSN('GET', '/monitoring?jenis=laporan_akhir')).data[0].status, 'menunggu');

  const p = (jenis, body) => DSN('POST', `/bimbingan/${mine.idKonversi}/dokumen/${jenis}/periksa`, body);
  assert.equal((await p('laporan_akhir', { setuju: false })).status, 400); // catatan wajib
  assert.equal((await p('laporan_akhir', { setuju: false, catatan: 'Tanda tangan belum ada', batas_revisi: '2000-01-01' })).status, 400); // batas revisi lampau
  assert.equal((await p('laporan_akhir', { setuju: false, catatan: 'Tanda tangan belum ada', batas_revisi: '2099-01-31' })).status, 200);
  assert.equal((await p('laporan_akhir', { setuju: true })).status, 409); // sudah diperiksa
  assert.equal((await p('sertifikat', { setuju: true })).status, 200);
  assert.equal((await p('nilai_mitra', { setuju: true })).status, 404); // belum diunggah

  const detail = (await DSN('GET', `/monitoring/${mine.idKonversi}/laporan_akhir`)).data;
  assert.deepEqual([detail.status, detail.catatan_dosen, detail.batas_revisi], ['perlu_perbaikan', 'Tanda tangan belum ada', '2099-01-31']);
  assert.deepEqual(detail.riwayat.map((x) => x.judul), ['Dikirim mahasiswa (Laporan Akhir)', 'Perlu perbaikan (Laporan Akhir)']);
  // mahasiswa melihat catatan dan batas revisi yang sama
  const sisiMhs = (await req('t-a', 'GET', '/mahasiswa/dokumen-magang')).data.dokumen[0];
  assert.deepEqual([sisiMhs.catatan_dosen, sisiMhs.batas_revisi], ['Tanda tangan belum ada', '2099-01-31']);
  // unggah ulang oleh mahasiswa → "menunggu pemeriksaan ulang"
  assert.equal((await req('t-a', 'POST', '/mahasiswa/dokumen-magang/laporan_akhir', { pdf: true })).status, 200);
  assert.equal((await DSN('GET', '/monitoring?jenis=laporan_akhir&status=menunggu_ulang')).data.length, 1);
  assert.equal((await p('laporan_akhir', { setuju: true })).status, 200);
  assert.equal((await DSN('GET', '/dashboard')).data.ringkasan.perlu_perbaikan, 0);
});

test('pengesahan laporan akhir: hanya setelah disetujui, sekali saja, mahasiswa bisa mengunduh', async () => {
  const url = `/bimbingan/${mine.idKonversi}/laporan/tanda-tangan`;
  assert.equal((await DSN('POST', `/bimbingan/${bukan.idKonversi}/laporan/tanda-tangan`)).status, 404);
  const sebelum = await DSN('GET', `/bimbingan/${mine.idKonversi}/laporan/ttd`);
  assert.equal(sebelum.status, 404);
  const ok = await DSN('POST', url);
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.id_verifikasi.length, 16);
  assert.equal((await DSN('POST', url)).status, 409); // sudah ditandatangani
  const unduh = await DSN('GET', `/bimbingan/${mine.idKonversi}/laporan/ttd`);
  assert.equal(Buffer.from(unduh.data).subarray(0, 5).toString(), '%PDF-');
  const mhs = (await req('t-a', 'GET', '/mahasiswa/dokumen-magang')).data;
  assert.equal(mhs.dokumen[0].ada_ttd, true);
  assert.equal((await req('t-a', 'GET', '/mahasiswa/dokumen-magang/laporan_akhir/ttd')).status, 200);
  const { rows: [dokTtd] } = await db.query("SELECT ttd_digital FROM dokumen_akhir WHERE id_penerimaan = $1 AND jenis_dokumen = 'laporan_akhir'", [mine.idPenerimaan]);
  assert.equal(dokTtd.ttd_digital, true);
});

test('profil dan notifikasi dosen', async () => {
  assert.equal((await DSN('GET', '/profil')).data.nidn, '0312088501');
  assert.equal((await DSN('PUT', '/profil', { no_telepon: '123' })).status, 400);
  assert.equal((await DSN('PUT', '/profil', { no_telepon: '081299990000' })).status, 200);
  const n = (await DSN('GET', '/notifikasi')).data;
  assert.ok(n.belum_dibaca > 0 && n.item.some((x) => x.judul.startsWith('Pengiriman')));
  await DSN('POST', '/notifikasi/baca');
  assert.equal((await DSN('GET', '/notifikasi')).data.belum_dibaca, 0);
  assert.ok((await DSN('GET', '/riwayat')).data.length >= 3);
  assert.equal((await DSN('GET', `/bimbingan/${mine.idKonversi}`)).data.aktivitas.length >= 3, true);
});

test('menyetujui semua dokumen wajib mengubah status penerimaan dan konversi menjadi selesai', async () => {
  await dokumen(mine.idPenerimaan, 'nilai_mitra');
  assert.equal((await DSN('POST', `/bimbingan/${mine.idKonversi}/dokumen/nilai_mitra/periksa`, { setuju: true })).status, 200);
  const { rows: [pen] } = await db.query('SELECT status FROM penerimaan_magang WHERE id_penerimaan = $1', [mine.idPenerimaan]);
  const { rows: [konv] } = await db.query('SELECT status FROM pengajuan_konversi WHERE id_konversi = $1', [mine.idKonversi]);
  const { rows: rw } = await db.query("SELECT status_baru FROM riwayat_status WHERE jenis_objek = 'pengajuan_konversi' AND id_objek = $1", [mine.idKonversi]);
  assert.deepEqual([pen.status, konv.status], ['selesai', 'selesai']);
  assert.equal(rw.some((x) => x.status_baru === 'selesai'), true);
  assert.equal((await DSN('GET', `/bimbingan/${mine.idKonversi}`)).data.status_magang, 'selesai');

  // unggah TTD manual tidak menandai ttd_digital = true
  const manual = await bimbing('t-c', '11120003', dosen.id_dosen);
  await dokumen(manual.idPenerimaan, 'laporan_akhir');
  assert.equal((await DSN('POST', `/bimbingan/${manual.idKonversi}/dokumen/laporan_akhir/periksa`, { setuju: true })).status, 200);
  assert.equal((await DSN('POST', `/bimbingan/${manual.idKonversi}/laporan/ttd-unggah`, { pdf: true })).status, 200);
  const { rows: [dokManual] } = await db.query("SELECT file_ttd, ttd_digital FROM dokumen_akhir WHERE id_penerimaan = $1 AND jenis_dokumen = 'laporan_akhir'", [manual.idPenerimaan]);
  assert.ok(dokManual.file_ttd);
  assert.equal(dokManual.ttd_digital, false);
});
