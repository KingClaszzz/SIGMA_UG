import test from 'node:test';
import assert from 'node:assert/strict';
import { buatApp } from '../app.js';
import { buatDbUji, storageUji } from './dbUji.js';

const db = await buatDbUji();
const storage = storageUji();
const identitas = {};
const dibuat = [];
const akunUji = { async buat({ email }) { if (email === 'ada@uji.test') throw new Error('EMAIL_ADA'); const id = `11111111-1111-4111-8111-${String(dibuat.length + 1).padStart(12, '0')}`; dibuat.push(id); return id; }, async hapus() {} };
const server = buatApp({ db, storage, verifikasi: async (t) => identitas[t] ?? null, akun: akunUji }).listen(0);
test.after(() => server.close());

async function req(token, method, rute, body) {
  const res = await fetch(`http://localhost:${server.address().port}/api${rute}`, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  });
  const json = (res.headers.get('content-type') ?? '').includes('json');
  return { status: res.status, data: json ? await res.json() : await res.arrayBuffer(), tipe: res.headers.get('content-type') };
}
const ADM = (m, r, b) => req('t-admin', m, `/admin${r}`, b);

// ---------- data awal ----------
let n = 0;
async function akun(token, email, peran) {
  const auth_id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
  identitas[token] = { auth_id, email, nama: email.split('@')[0] };
  const { rows: [u] } = await db.query('INSERT INTO users (auth_id, email, nama, peran) VALUES ($1, $2, $3, $4) RETURNING id_user', [auth_id, email, email.split('@')[0], peran]);
  return u.id_user;
}
async function mahasiswa(token, email, npm, { ipk = 3.5, verifikasi = 'terverifikasi', semester = 7, e = false } = {}) {
  const id_user = await akun(token, email, 'mahasiswa');
  const { rows: [m] } = await db.query(`INSERT INTO mahasiswa (id_user, npm, ipk, semester, no_telepon, status_aktif, status_cuti, ada_nilai_e, status_verifikasi)
    VALUES ($1, $2, $3, $4, '081200000000', true, false, $5, $6) RETURNING id_mahasiswa`, [id_user, npm, ipk, semester, e, verifikasi]);
  return m.id_mahasiswa;
}
async function pengajuan(idMhs, status = 'diajukan', kategori = 2) {
  const { rows: [p] } = await db.query(`INSERT INTO pengajuan_rekomendasi (id_mahasiswa, id_kategori, nama_perusahaan, kepada, alamat_perusahaan, tgl_mulai, tgl_selesai, status)
    VALUES ($1, $2, 'PT Uji', 'HRD', 'Depok', '2027-01-04', '2027-04-02', $3) RETURNING id_pengajuan`, [idMhs, kategori, status]);
  await db.query("INSERT INTO riwayat_status (jenis_objek, id_objek, status_baru) VALUES ('pengajuan_rekomendasi', $1, $2)", [p.id_pengajuan, status]);
  return p.id_pengajuan;
}

const idAdminUser = await akun('t-admin', 'admin@uji.test', 'admin');
await db.query("INSERT INTO admin (id_user, nip, jabatan, no_telepon) VALUES ($1, '198001', 'CP Magang', '081200000001')", [idAdminUser]);
await akun('t-admin-kosong', 'admin2@uji.test', 'admin'); // peran admin tapi profil belum dibuat
const idDosenUser = await akun('t-dosen', 'dosen@uji.test', 'dosen');
const { rows: [dosen] } = await db.query("INSERT INTO dosen (id_user, nidn, no_telepon) VALUES ($1, '0312088501', '081200000002') RETURNING id_dosen", [idDosenUser]);
const A = await mahasiswa('t-a', 'a@uji.test', '19990001');
const B = await mahasiswa('t-b', 'b@uji.test', '19990002', { ipk: 2.9 });
const C = await mahasiswa('t-c', 'c@uji.test', '11120003', { verifikasi: 'menunggu' });

test('hanya admin yang punya profil boleh masuk rute admin', async () => {
  assert.equal((await req('t-a', 'GET', '/admin/dashboard')).status, 403);
  assert.equal((await req('t-dosen', 'GET', '/admin/dashboard')).status, 403);
  assert.equal((await req('t-admin-kosong', 'GET', '/admin/dashboard')).status, 403);
  assert.equal((await req(null, 'GET', '/admin/dashboard')).status, 401);
  assert.equal((await req('t-a', 'GET', '/saya')).data.peran, 'mahasiswa');
  assert.equal((await ADM('GET', '/dashboard')).status, 200);
});

test('validasi massal: lolos disetujui, tidak lolos ditolak beralasan, belum diverifikasi dilewati', async () => {
  const pa = await pengajuan(A), pb = await pengajuan(B), pc = await pengajuan(C), pd = await pengajuan(A, 'disetujui');
  const daftar = (await ADM('GET', '/rekomendasi?status=diajukan')).data;
  assert.deepEqual(daftar.map((x) => x.id).sort(), [pa, pb, pc].sort());
  assert.deepEqual(daftar.find((x) => x.id === pb).syarat.gagal, ['IPK di bawah 3.00']);

  assert.equal((await ADM('POST', '/rekomendasi/validasi', { ids: [] })).status, 400);
  const { hasil } = (await ADM('POST', '/rekomendasi/validasi', { ids: [pa, pb, pc, pd] })).data;
  const per = Object.fromEntries(hasil.map((h) => [h.id, h]));
  assert.equal(per[pa].hasil, 'disetujui');
  assert.match(per[pa].nomor_surat, /^001\/REK\/SI-UG\/[IVX]+\/\d{4}$/); // disetujui = surat langsung terbit
  assert.equal(per[pb].hasil, 'ditolak');
  assert.match(per[pb].alasan, /IPK/);
  assert.equal(per[pc].hasil, 'dilewati');
  assert.equal(per[pd].hasil, 'dilewati'); // bukan berstatus Diajukan

  const dB = (await ADM('GET', `/rekomendasi/${pb}`)).data;
  assert.deepEqual([dB.status, dB.alasan_penolakan], ['ditolak', 'IPK di bawah 3.00']);
  assert.deepEqual(dB.riwayat.map((x) => x.status), ['diajukan', 'ditolak']);
  // mahasiswa melihat alasan yang sama di sisinya
  assert.match((await req('t-b', 'GET', `/mahasiswa/rekomendasi/${pb}`)).data.alasan_penolakan, /IPK/);

  // batas dua kali magang termasuk magang mandiri (BR-03)
  await db.query("INSERT INTO riwayat_magang (id_mahasiswa, nama_perusahaan, tahun, sumber) VALUES ($1, 'X', 2024, 'input_mahasiswa'), ($1, 'Y', 2025, 'input_mahasiswa')", [A]);
  const p3 = await pengajuan(A);
  const r3 = (await ADM('POST', '/rekomendasi/validasi', { ids: [p3] })).data.hasil[0];
  assert.deepEqual([r3.hasil, r3.alasan], ['ditolak', 'Sudah mengikuti magang 2 kali']);
  await db.query('DELETE FROM riwayat_magang');

  // verifikasi data diri lalu validasi ulang pengajuan C
  assert.equal((await ADM('PUT', `/mahasiswa/${C}/verifikasi`, { status: 'tidak_sesuai' })).status, 400); // catatan wajib
  assert.equal((await ADM('PUT', `/mahasiswa/${C}/verifikasi`, { status: 'terverifikasi' })).status, 200);
  assert.equal((await ADM('POST', '/rekomendasi/validasi', { ids: [pc] })).data.hasil[0].hasil, 'disetujui');
});

test('setujui satu pengajuan bersyarat, minta perbaikan mengembalikan ke mahasiswa', async () => {
  const ok = await pengajuan(A), buruk = await pengajuan(B), balik = await pengajuan(A);
  assert.equal((await ADM('POST', `/rekomendasi/${buruk}/setujui`)).status, 409); // IPK 2.9
  assert.match((await ADM('POST', `/rekomendasi/${buruk}/setujui`)).data.error, /IPK/);
  assert.equal((await ADM('POST', `/rekomendasi/${ok}/setujui`)).status, 200);
  assert.equal((await ADM('POST', `/rekomendasi/${ok}/setujui`)).status, 409); // sudah disetujui
  assert.equal((await ADM('POST', `/rekomendasi/${balik}/perbaikan`, { catatan: '' })).status, 400);
  assert.equal((await ADM('POST', `/rekomendasi/${balik}/perbaikan`, { catatan: 'Rangkuman nilai tidak terbaca' })).status, 200);
  const lihat = (await req('t-a', 'GET', `/mahasiswa/rekomendasi/${balik}`)).data;
  assert.deepEqual([lihat.status, lihat.alasan_penolakan], ['draft', 'Rangkuman nilai tidak terbaca']);
  const detail = (await ADM('GET', `/rekomendasi/${ok}`)).data;
  assert.ok(detail.syarat.daftar.every((x) => x.ok));
  await db.query("UPDATE pengajuan_rekomendasi SET status = 'ditolak' WHERE id_pengajuan = ANY($1)", [[ok, buruk, balik]]); // bersihkan agar tes berikutnya tidak terpengaruh
});

test('persetujuan menerbitkan surat PDF bernomor yang bisa diunduh mahasiswa', async () => {
  const terbit = (await ADM('GET', '/rekomendasi?status=diterbitkan')).data;
  assert.ok(terbit.length >= 2);
  const milikA = terbit.find((x) => x.mahasiswa.npm === '19990001');
  const detail = (await ADM('GET', `/rekomendasi/${milikA.id}`)).data;
  assert.match(detail.surat.nomor_surat, /^00\d\/REK\//);
  assert.deepEqual(detail.riwayat_detail.map((x) => x.judul), ['Pengajuan dikirim mahasiswa', 'Disetujui dan surat diterbitkan']);
  assert.equal(detail.admin_pemeriksa, 'admin');
  assert.equal((await ADM('POST', `/rekomendasi/${milikA.id}/setujui`)).status, 409); // tidak terbit dua kali
  assert.equal((await ADM('GET', '/rekomendasi?q=11120002')).data.every((x) => x.mahasiswa.npm === '19990002'), true);

  const unduh = await req('t-a', 'GET', `/mahasiswa/rekomendasi/${milikA.id}/surat`);
  assert.equal(unduh.tipe, 'application/pdf');
  assert.equal(Buffer.from(unduh.data).subarray(0, 5).toString(), '%PDF-');
  assert.equal((await req('t-b', 'GET', `/mahasiswa/rekomendasi/${milikA.id}/surat`)).status, 404); // bukan miliknya
  assert.equal((await ADM('GET', `/rekomendasi/${milikA.id}/surat`)).tipe, 'application/pdf');
});

test('admin mengisi nomor surat dan TTD, pratinjau tidak menerbitkan, terbit ulang mengganti nomor', async () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const id = await pengajuan(A);
  const pratinjau = await ADM('POST', `/rekomendasi/${id}/pratinjau`, { nomor_surat: '118/PS-SI/S1/VIII/2026', ttd: PNG });
  assert.equal(pratinjau.tipe, 'application/pdf');
  assert.equal((await ADM('GET', `/rekomendasi/${id}`)).data.status, 'diajukan'); // pratinjau tidak mengubah apa pun
  assert.equal((await ADM('POST', `/rekomendasi/${id}/setujui`, { nomor_surat: 'x' })).status, 400);
  assert.equal((await ADM('POST', `/rekomendasi/${id}/setujui`, { ttd: 'data:image/png;base64,AAAA' })).status, 400); // bukan PNG
  assert.equal((await ADM('POST', `/rekomendasi/${id}/setujui`, { nomor_surat: '118/PS-SI/S1/VIII/2026', ttd: PNG })).data.nomor_surat, '118/PS-SI/S1/VIII/2026');

  const lain = await pengajuan(A);
  assert.equal((await ADM('POST', `/rekomendasi/${lain}/setujui`, { nomor_surat: '118/PS-SI/S1/VIII/2026' })).status, 409); // nomor kembar
  assert.equal((await ADM('GET', `/rekomendasi/${lain}`)).data.status, 'diajukan');
  assert.equal((await ADM('POST', `/rekomendasi/${lain}/surat/ulang`, {})).status, 409); // belum terbit

  assert.equal((await ADM('POST', `/rekomendasi/${id}/surat/ulang`, { nomor_surat: '119/PS-SI/S1/VIII/2026' })).data.nomor_surat, '119/PS-SI/S1/VIII/2026');
  assert.equal((await ADM('GET', `/rekomendasi/${id}`)).data.surat.nomor_surat, '119/PS-SI/S1/VIII/2026');
  assert.equal((await req('t-a', 'GET', `/mahasiswa/rekomendasi/${id}/surat`)).tipe, 'application/pdf'); // mahasiswa hanya mengunduh
  await db.query("UPDATE pengajuan_rekomendasi SET status = 'ditolak' WHERE id_pengajuan = ANY($1)", [[id, lain]]); // tidak memengaruhi tes berikutnya
});

test('konversi: periksa berkas → pemetaan → setujui (surat terbit) → dosen terpisah', async () => {
  const idP = (await ADM('GET', '/rekomendasi?status=diterbitkan')).data.find((x) => x.mahasiswa.npm === '19990001').id;
  const { rows: [pen] } = await db.query("INSERT INTO penerimaan_magang (id_pengajuan, posisi, tgl_mulai, tgl_selesai, file_surat_penerimaan, pilih_konversi, status) VALUES ($1, 'Dev', '2027-01-04', '2027-04-02', 'x.pdf', true, 'diterima_perusahaan') RETURNING id_penerimaan", [idP]);
  const { rows: [k] } = await db.query("INSERT INTO pengajuan_konversi (id_penerimaan, file_silabus, status) VALUES ($1, 's.pdf', 'diajukan') RETURNING id_konversi", [pen.id_penerimaan]);
  await db.query("INSERT INTO riwayat_status (jenis_objek, id_objek, status_baru) VALUES ('pengajuan_konversi', $1, 'diajukan')", [k.id_konversi]);
  const id = k.id_konversi;

  assert.equal((await ADM('POST', `/konversi/${id}/hasil`, { matkul: [] })).status, 400);
  assert.equal((await ADM('POST', `/konversi/${id}/periksa`, { lengkap: false })).status, 400); // alasan wajib
  assert.equal((await ADM('POST', `/konversi/${id}/periksa`, { lengkap: true })).status, 200);
  assert.equal((await ADM('POST', `/konversi/${id}/periksa`, { lengkap: true })).status, 409); // sudah diperiksa

  const mk = (await ADM('POST', '/mata-kuliah', { kode_mk: 'it011243', nama_mk: 'Pemrograman Web', sks: 3 })).data;
  assert.equal(mk.kode_mk, 'IT011243');
  assert.equal((await ADM('POST', '/mata-kuliah', { kode_mk: 'IT011243', nama_mk: 'Lain', sks: 2 })).status, 409);
  const mk2 = (await ADM('POST', '/mata-kuliah', { kode_mk: 'IT011245', nama_mk: 'Manajemen Proyek', sks: 2 })).data;

  assert.equal((await ADM('POST', `/konversi/${id}/hasil`, { matkul: [{ id_matkul: mk.id, sks_diakui: 4 }] })).status, 400); // melebihi SKS mata kuliah
  assert.equal((await ADM('POST', `/konversi/${id}/setujui`)).status, 409); // belum ada pemetaan
  assert.equal((await ADM('POST', `/konversi/${id}/hasil`, { matkul: [{ id_matkul: mk.id, sks_diakui: 3, keterangan: 'Sesuai proyek web' }, { id_matkul: mk2.id, sks_diakui: 2 }] })).status, 200);
  assert.deepEqual((await ADM('GET', `/konversi/${id}`)).data.matkul.map((x) => x.keterangan),['Sesuai proyek web', 'Tidak mengikuti perkuliahan, UTS, UAS/Ujian Utama, Praktikum Penunjang dan Wajib Mengikuti Ujian Capaian Pembelajaran.']);
  assert.equal((await ADM('POST', `/konversi/${id}/dosen`, { id_dosen: dosen.id_dosen })).status, 409); // belum disetujui

  // pemetaan belum final: mahasiswa belum melihat hasilnya
  const sebelum = (await req('t-a', 'GET', `/mahasiswa/konversi/${id}`)).data;
  assert.deepEqual([sebelum.status, sebelum.hasil], ['ditinjau', null]);
  assert.deepEqual((await ADM('GET', `/konversi/${id}`)).data.kuota, { disetujui: 0, batas: 2 });

  const setuju = (await ADM('POST', `/konversi/${id}/setujui`)).data;
  assert.match(setuju.nomor_surat, /^001\/KNV\//); // persetujuan langsung menerbitkan surat
  assert.equal((await ADM('POST', `/konversi/${id}/setujui`)).status, 409);
  assert.equal((await ADM('GET', '/dashboard')).data.ringkasan.belum_dosen, 1);
  assert.deepEqual((await ADM('GET', '/penugasan/ringkasan')).data, { total: 1, belum: 1, sudah: 0 });
  assert.equal((await ADM('GET', '/konversi?penugasan=belum')).data.length, 1);
  assert.equal((await ADM('POST', `/konversi/${id}/dosen`, { id_dosen: 9999 })).status, 400);
  assert.equal((await req('t-a', 'GET', `/mahasiswa/konversi/${id}`)).data.status, 'diterbitkan');

  assert.equal((await ADM('POST', `/konversi/${id}/dosen`, { id_dosen: dosen.id_dosen })).status, 200);
  assert.equal((await ADM('POST', `/konversi/${id}/dosen`, { id_dosen: dosen.id_dosen })).status, 200); // boleh diganti
  assert.deepEqual((await ADM('GET', '/penugasan/ringkasan')).data, { total: 1, belum: 0, sudah: 1 });
  const lihat = (await req('t-a', 'GET', `/mahasiswa/konversi/${id}`)).data;
  assert.deepEqual([lihat.status, lihat.dosen_pendamping, lihat.hasil.matkul.length, lihat.surat_tersedia], ['diterbitkan', 'dosen', 2, true]);
  const pdf = await req('t-a', 'GET', `/mahasiswa/konversi/${id}/surat`);
  assert.equal(pdf.tipe, 'application/pdf');
  const dash = (await req('t-a', 'GET', '/mahasiswa/dashboard')).data;
  assert.deepEqual([dash.sks_konversi, dash.dosen_pendamping], [5, 'dosen']);
  assert.deepEqual((await ADM('GET', `/konversi/${id}`)).data.riwayat.map((x) => x.status), ['diajukan', 'ditinjau', 'diproses', 'diterbitkan']);
  assert.equal((await ADM('GET', '/dashboard')).data.ringkasan.sedang_magang, 1);
});

test('periode: draft tidak tampil di publik, publikasi menampilkan jadwal konversi sendiri', async () => {
  const dasar = { tahun_akademik: 'PTA 2026/2027', gelombang: 1, nama_periode: 'Gelombang 1', semester: 'Genap', tgl_buka: '2026-11-01', tgl_tutup: '2026-12-31', batas_konversi: '2027-02-28', batas_laporan: '2027-05-31' };
  const publik = async () => (await fetch(`http://localhost:${server.address().port}/api/publik/periode`)).json();
  assert.equal((await ADM('POST', '/periode', { ...dasar, tahun_akademik: 'UJI 2026' })).status, 400);
  assert.equal((await ADM('POST', '/periode', { ...dasar, tgl_tutup: '2026-10-01' })).status, 400);
  assert.equal((await ADM('POST', '/periode', { ...dasar, batas_konversi: '2026-12-01' })).status, 400);
  assert.equal((await ADM('POST', '/periode', { ...dasar, min_ipk: 5 })).status, 400);
  assert.equal((await ADM('POST', '/periode', { ...dasar, semester: undefined })).status, 400);
  assert.equal((await ADM('POST', '/periode', { ...dasar, tgl_buka_konversi: '2027-01-10' })).status, 201); // butuh batas_konversi: ada, jadi sah

  const draft = (await ADM('POST', '/periode', { ...dasar, status: 'draft', nama_periode: 'Gelombang 1', min_semester: 6 })).data;
  assert.equal((await publik()).tgl_tutup, '2026-12-31'); // periode terbit sebelumnya tetap yang berjalan
  await db.query('DELETE FROM periode_magang'); // mulai dari kosong
  const d2 = (await ADM('POST', '/periode', { ...dasar, status: 'draft', min_semester: 6 })).data;
  assert.equal((await publik()).tersedia, false);
  const terbit = (await ADM('PUT', `/periode/${d2.id_periode}`, { ...dasar, status: 'dipublikasikan', tgl_buka_konversi: '2027-01-10', min_semester: 6, min_ipk: 3.25 })).data;
  const p = await publik();
  assert.deepEqual([p.tersedia, p.jadwal[1].buka, p.min_semester, p.min_ipk], [true, '2027-01-10', 6, 3.25]);
  assert.ok(terbit.jadwal.length === 2 && draft.id_periode);

  // ambang periode dipakai evaluasi: semester 6 ke atas dan IPK 3.25
  const D = await mahasiswa('t-d', 'd@uji.test', '11120004', { ipk: 3.2, semester: 7 });
  const pd = await pengajuan(D);
  const r = (await ADM('POST', '/rekomendasi/validasi', { ids: [pd] })).data.hasil[0];
  assert.deepEqual([r.hasil, r.alasan], ['ditolak', 'IPK di bawah 3.25']);
});

test('monitoring, notifikasi, dan status periode', async () => {
  const mon = (await ADM('GET', '/monitoring')).data;
  assert.equal(mon.total, 1);
  assert.deepEqual(mon.data[0].progres, { disetujui: 0, total: 3 });
  assert.equal(mon.stat.menunggu_pengumpulan, 1);
  const detail = (await ADM('GET', `/monitoring/${mon.data[0].id}`)).data;
  assert.equal(detail.dokumen.length, 4);
  assert.equal(detail.dokumen[0].status, 'belum_diunggah');
  assert.equal((await ADM('GET', '/monitoring/999999')).status, 404);

  const nt = (await ADM('GET', '/notifikasi')).data;
  assert.ok(nt.belum_dibaca > 0 && nt.item.length > 0);
  await ADM('POST', '/notifikasi/baca');
  assert.equal((await ADM('GET', '/notifikasi')).data.belum_dibaca, 0);

  const p = (await ADM('GET', '/periode')).data[0];
  assert.equal(p.status_tampil, 'aktif');
  assert.equal((await ADM('POST', `/periode/${p.id_periode}/status`, { status: 'draft' })).data.status_tampil, 'draft');
  assert.equal((await ADM('GET', '/periode?status=draft')).data.length, 1);
  assert.equal((await ADM('GET', `/periode/${p.id_periode}`)).data.mengajukan, 0);
  await ADM('POST', `/periode/${p.id_periode}/status`, { status: 'dipublikasikan' });
});

test('manajemen akun dosen', async () => {
  const baru = { nama: 'Dosen Baru', nidn: '0412088502', email: 'baru@uji.test', no_telepon: '081234567890', password: 'sandi-awal-1' };
  assert.equal((await ADM('POST', '/akun/dosen', { ...baru, password: 'pendek' })).status, 400);
  assert.equal((await ADM('POST', '/akun/dosen', { ...baru, email: 'ada@uji.test' })).status, 409);
  assert.equal((await ADM('POST', '/akun/dosen', { ...baru, nidn: '0312088501' })).status, 409);
  assert.equal((await ADM('POST', '/akun/dosen', baru)).status, 201);
  const daftar = (await ADM('GET', '/akun/dosen?q=baru')).data;
  assert.equal(daftar.length, 1);
  assert.equal((await ADM('PUT', `/akun/${daftar[0].id_user}/aktif`, { aktif: false })).status, 200);
  assert.equal((await ADM('GET', '/akun/dosen?status=nonaktif')).data.length, 1);
  assert.equal((await ADM('PUT', `/akun/${idAdminUser}/aktif`, { aktif: false })).status, 409); // bukan akun sendiri
  assert.equal((await ADM('GET', '/dosen')).data.some((d) => d.nidn === baru.nidn), false); // nonaktif tidak bisa dipilih
});

test('NPM: cek ketersediaan untuk pendaftaran, lepas NPM hanya bila akun belum punya pengajuan', async () => {
  const pengisiIseng = await mahasiswa('t-iseng', 'iseng@uji.test', '19990101', { verifikasi: 'menunggu' });
  const sudahAjukan = await mahasiswa('t-ada', 'ada2@uji.test', '19990102');
  await pengajuan(sudahAjukan);
  assert.equal((await req(null, 'GET', '/publik/npm/19990101')).data.tersedia, false);
  assert.equal((await req(null, 'GET', '/publik/npm/11120009')).data.tersedia, true);
  assert.equal((await req(null, 'GET', '/publik/npm/1234')).status, 400);
  assert.equal((await ADM('POST', `/mahasiswa/${sudahAjukan}/lepas-npm`)).status, 409);
  assert.equal((await ADM('POST', `/mahasiswa/${pengisiIseng}/lepas-npm`)).status, 200);
  assert.equal((await req(null, 'GET', '/publik/npm/19990101')).data.tersedia, true);
  const { rows: [u] } = await db.query("SELECT is_aktif FROM users WHERE email = 'iseng@uji.test'");
  assert.equal(u.is_aktif, false);
});
