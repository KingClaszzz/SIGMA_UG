import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { buatApp } from '../app.js';
import { buatDbUji, storageUji } from './dbUji.js';

const db = await buatDbUji();
const storage = storageUji();
const terkirim = [];
let modeKirim = 'sukses'; // 'sukses' | 'error'

const kirimEmailUji = async (msg) => {
  if (modeKirim === 'error') throw new Error('SMTP down');
  terkirim.push(msg);
};

const identitas = {};
const server = buatApp({ db, storage, verifikasi: async (t) => identitas[t] ?? null, kirimEmail: kirimEmailUji }).listen(0);
test.after(() => server.close());

async function req(token, method, rute, { body, berkas } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (berkas) Object.assign(headers, { 'Content-Type': 'application/pdf', 'X-Filename': 'dok.pdf' });
  else if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`http://localhost:${server.address().port}/api${rute}`, { method, headers, body: berkas ?? (body && JSON.stringify(body)) });
  const json = (res.headers.get('content-type') ?? '').includes('json');
  return { status: res.status, data: json ? await res.json() : null };
}

const PDF = Buffer.from(await (async () => { const d = await PDFDocument.create(); d.addPage(); return d.save(); })());
const hari = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

let seq = 0;
async function buatUser(token, email, peran) {
  const auth_id = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
  identitas[token] = { auth_id, email, nama: token };
  const { rows: [u] } = await db.query('INSERT INTO users (auth_id, email, nama, peran) VALUES ($1, $2, $3, $4) RETURNING id_user', [auth_id, email, token, peran]);
  return u.id_user;
}

const idAdmUser = await buatUser('t-adm', 'adm@uji.test', 'admin');
await db.query("INSERT INTO admin (id_user, nip, jabatan, no_telepon) VALUES ($1, '198099', 'CP', '081200000099')", [idAdmUser]);
const idDsnUser = await buatUser('t-dsn', 'dsn@uji.test', 'dosen');
const { rows: [dsn] } = await db.query("INSERT INTO dosen (id_user, nidn, no_telepon) VALUES ($1, '0312088599', '081200000098') RETURNING id_dosen", [idDsnUser]);
const idMhsUser = await buatUser('t-mhs', 'mhs@uji.test', 'mahasiswa');
const { rows: [mhs] } = await db.query(`INSERT INTO mahasiswa (id_user, npm, ipk, semester, no_telepon, alamat, status_aktif, status_cuti, ada_nilai_e, status_verifikasi)
  VALUES ($1, '11123999', 3.6, 7, '081200000097', 'Jl. Margonda Raya No. 1, Depok', true, false, false, 'terverifikasi') RETURNING id_mahasiswa`, [idMhsUser]);
await db.query("INSERT INTO mata_kuliah (kode_mk, nama_mk, sks) VALUES ('IT011999', 'Kerja Praktik', 3)");
await db.query("INSERT INTO periode_magang (tahun_akademik, gelombang, tgl_buka, tgl_tutup, tgl_buka_konversi, batas_konversi, batas_laporan) VALUES ('PTA 2026/2027', 1, $1, $2, $1, $3, $4)", [hari(-10), hari(10), hari(30), hari(60)]);

test('notifikasi email terkirim di seluruh event utama dan tercatat di notifikasi_email', async () => {
  const rek = (await req('t-mhs', 'POST', '/mahasiswa/rekomendasi', {
    body: { id_kategori: 2, nama_perusahaan: 'PT Email', kepada: 'HRD', alamat_perusahaan: 'Jakarta', tgl_mulai: '2027-01-01', tgl_selesai: '2027-03-31' },
  })).data;
  for (const j of ['rangkuman_nilai', 'bukti_pembayaran', 'surat_izin_orang_tua']) {
    await req('t-mhs', 'POST', `/mahasiswa/rekomendasi/${rek.id}/dokumen/${j}`, { berkas: PDF });
  }

  assert.equal((await req('t-mhs', 'POST', `/mahasiswa/rekomendasi/${rek.id}/kirim`)).status, 200);
  assert.equal((await req('t-adm', 'POST', `/admin/rekomendasi/${rek.id}/perbaikan`, { body: { catatan: 'Perbaiki alamat' } })).status, 200);
  assert.equal((await req('t-mhs', 'POST', `/mahasiswa/rekomendasi/${rek.id}/kirim`)).status, 200);
  assert.equal((await req('t-adm', 'POST', `/admin/rekomendasi/${rek.id}/setujui`, { body: {} })).status, 200);

  const knv = (await req('t-mhs', 'POST', '/mahasiswa/konversi', {
    body: { id_pengajuan: rek.id, posisi: 'Engineer', tgl_mulai: '2027-01-01', tgl_selesai: '2027-03-31' },
  })).data;
  await req('t-mhs', 'POST', `/mahasiswa/konversi/${knv.id}/surat-penerimaan`, { berkas: PDF });
  await req('t-mhs', 'POST', `/mahasiswa/konversi/${knv.id}/silabus`, { berkas: PDF });
  assert.equal((await req('t-mhs', 'POST', `/mahasiswa/konversi/${knv.id}/kirim`)).status, 200);
  assert.equal((await req('t-adm', 'POST', `/admin/konversi/${knv.id}/periksa`, { body: { lengkap: true } })).status, 200);
  assert.equal((await req('t-adm', 'POST', `/admin/konversi/${knv.id}/hasil`, { body: { matkul: [{ id_matkul: 1, sks_diakui: 3 }] } })).status, 200);
  assert.equal((await req('t-adm', 'POST', `/admin/konversi/${knv.id}/setujui`)).status, 200);
  assert.equal((await req('t-adm', 'POST', `/admin/konversi/${knv.id}/dosen`, { body: { id_dosen: dsn.id_dosen } })).status, 200);

  assert.equal((await req('t-mhs', 'POST', '/mahasiswa/dokumen-magang/laporan_akhir', { berkas: PDF })).status, 200);
  assert.equal((await req('t-dsn', 'POST', `/dosen/bimbingan/${knv.id}/dokumen/laporan_akhir/periksa`, { body: { setuju: true } })).status, 200);
  assert.equal((await req('t-dsn', 'POST', `/dosen/bimbingan/${knv.id}/laporan/tanda-tangan`)).status, 200);

  const { rows: log } = await db.query('SELECT jenis_event, status_kirim FROM notifikasi_email WHERE id_user = $1 ORDER BY id_notifikasi', [idMhsUser]);
  assert.deepEqual(log.map((x) => x.jenis_event), [
    'pengajuan_terkirim',
    'rekomendasi_perbaikan',
    'pengajuan_terkirim',
    'surat_terbit',
    'konversi_terkirim',
    'surat_konversi_terbit',
    'dosen_ditetapkan',
    'dokumen_disetujui',
    'laporan_ditandatangani',
  ]);
  assert.equal(log.every((x) => x.status_kirim === 'terkirim'), true);
  assert.equal(terkirim.length, 9);
  assert.equal(terkirim[0].to, 'mhs@uji.test');
});

test('email gagal saat SMTP bermasalah tetap meloloskan proses, tercatat gagal, dan bisa dikirim ulang admin', async () => {
  modeKirim = 'error';
  const { rows: [p] } = await db.query(`INSERT INTO pengajuan_rekomendasi (id_mahasiswa, id_kategori, nama_perusahaan, kepada, alamat_perusahaan, tgl_mulai, tgl_selesai, status)
    VALUES ($1, 2, 'PT Gagal SMTP', 'HRD', 'Depok', '2027-01-01', '2027-03-01', 'diajukan') RETURNING id_pengajuan`, [mhs.id_mahasiswa]);
  assert.equal((await req('t-adm', 'POST', `/admin/rekomendasi/${p.id_pengajuan}/tolak`, { body: { alasan: 'Perusahaan tidak sesuai ketentuan' } })).status, 200);

  const notif = (await req('t-adm', 'GET', '/admin/notifikasi')).data;
  assert.equal(notif.email_gagal, 1);
  const log = (await req('t-adm', 'GET', '/admin/notifikasi-email?status=gagal')).data;
  assert.deepEqual([log.stat.gagal, log.data.length], [1, 1]);
  assert.equal(log.data[0].jenis_event, 'rekomendasi_ditolak');

  // SMTP pulih → kirim ulang satuan dan massal berhasil
  modeKirim = 'sukses';
  const ulang = await req('t-adm', 'POST', `/admin/notifikasi-email/${log.data[0].id_notifikasi}/kirim-ulang`);
  assert.equal(ulang.status, 200);
  assert.deepEqual([ulang.data.ok, ulang.data.status_kirim], [true, 'terkirim']);
  assert.equal((await req('t-adm', 'GET', '/admin/notifikasi')).data.email_gagal, 0);

  modeKirim = 'error';
  await req('t-mhs', 'POST', '/mahasiswa/rekomendasi', {
    body: { id_kategori: 2, nama_perusahaan: 'PT Batch', kepada: 'HRD', alamat_perusahaan: 'Depok', tgl_mulai: '2027-01-01', tgl_selesai: '2027-03-01' },
  }).then(async ({ data: r }) => {
    for (const j of ['rangkuman_nilai', 'bukti_pembayaran', 'surat_izin_orang_tua']) await req('t-mhs', 'POST', `/mahasiswa/rekomendasi/${r.id}/dokumen/${j}`, { berkas: PDF });
    await req('t-mhs', 'POST', `/mahasiswa/rekomendasi/${r.id}/kirim`);
  });
  assert.equal((await req('t-adm', 'GET', '/admin/notifikasi')).data.email_gagal, 1);
  modeKirim = 'sukses';
  const batch = await req('t-adm', 'POST', '/admin/notifikasi-email/kirim-ulang-gagal');
  assert.equal(batch.status, 200);
  assert.deepEqual(batch.data, { total: 1, terkirim: 1, gagal: 0 });
});
