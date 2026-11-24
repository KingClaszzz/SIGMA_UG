import test from 'node:test';
import assert from 'node:assert/strict';
import { buatApp } from '../app.js';
import { buatDbUji, storageUji } from './dbUji.js';

const db = await buatDbUji();
const storage = storageUji();
// Token uji → identitas Supabase. Tidak ada jalan pintas di kode produksi: verifikasi disuntikkan.
const akun = {
  'token-a': { auth_id: '11111111-1111-4111-8111-111111111111', email: 'a@uji.test', nama: 'Akun A' },
  'token-b': { auth_id: '22222222-2222-4222-8222-222222222222', email: 'b@uji.test', nama: 'Akun B' },
};
const server = buatApp({ db, storage, verifikasi: async (t) => akun[t] ?? null }).listen(0);
test.after(() => server.close());

async function req(token, method, rute, { body, berkas } = {}) {
  const headers = { ...(token && { Authorization: `Bearer ${token}` }) };
  if (berkas) Object.assign(headers, { 'Content-Type': 'application/pdf', 'X-Filename': 'a.pdf' });
  else if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`http://localhost:${server.address().port}/api${rute}`, { method, headers, body: berkas ?? (body && JSON.stringify(body)) });
  const json = (res.headers.get('content-type') ?? '').includes('json');
  return { status: res.status, data: json ? await res.json() : null, tipe: res.headers.get('content-type') };
}
const A = (m, r, o) => req('token-a', m, `/mahasiswa${r}`, o);
const B = (m, r, o) => req('token-b', m, `/mahasiswa${r}`, o);

const PDF = Buffer.from('%PDF-1.4\n%contoh\n');
const hari = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const periode = async (tutup) => {
  const nilai = ['PTA 2026/2027', hari(-30), hari(tutup), hari(60), hari(120)];
  const { rowCount } = await db.query('UPDATE periode_magang SET tahun_akademik = $1, tgl_buka = $2, tgl_tutup = $3, batas_konversi = $4, batas_laporan = $5', nilai);
  if (!rowCount) await db.query('INSERT INTO periode_magang (tahun_akademik, gelombang, tgl_buka, tgl_tutup, batas_konversi, batas_laporan) VALUES ($1, 1, $2, $3, $4, $5)', nilai);
};
const form = { id_kategori: 2, nama_perusahaan: 'PT Uji', kepada: 'HRD', alamat_perusahaan: 'Depok', tgl_mulai: '2026-11-01', tgl_selesai: '2027-01-31' };
const akademik = { ipk: 3.4, semester: 7, no_telepon: '081234567890', alamat: 'Jl. Margonda Raya No. 100, Depok', status_aktif: true };

test('akses ditolak tanpa token yang sah, dan hanya untuk peran mahasiswa', async () => {
  assert.equal((await req(null, 'GET', '/mahasiswa/me')).status, 401);
  assert.equal((await req('token-ngawur', 'GET', '/mahasiswa/me')).status, 401);
  assert.equal((await A('GET', '/me')).data.terdaftar, false); // baris users dibuat otomatis
  await B('GET', '/me');
  await db.query("UPDATE users SET peran = 'admin' WHERE email = 'b@uji.test'");
  assert.equal((await B('GET', '/me')).status, 403);
  await db.query("UPDATE users SET peran = 'mahasiswa' WHERE email = 'b@uji.test'");
});

test('alur mahasiswa dari data diri sampai dokumen akhir', async () => {
  // data diri
  assert.equal((await A('PUT', '/me', { body: akademik })).status, 400); // nama dan NPM wajib saat pertama
  const dibuat = await A('PUT', '/me', { body: { ...akademik, nama: 'Uji Coba', npm: '11123000' } });
  assert.deepEqual([dibuat.data.npm, dibuat.data.email, dibuat.data.nama], ['11123000', 'a@uji.test', 'Uji Coba']);
  assert.equal((await A('PUT', '/me', { body: { ...akademik, npm: '99999999' } })).data.npm, '11123000'); // identitas tidak berubah
  assert.equal((await B('PUT', '/me', { body: { ...akademik, nama: 'Lain', npm: '11123000' } })).status, 409); // NPM unik

  // surat rekomendasi
  assert.equal((await A('POST', '/rekomendasi', { body: form })).status, 409); // periode belum ada
  await periode(30);
  assert.equal((await A('POST', '/rekomendasi', { body: { ...form, tgl_selesai: '2026-10-01' } })).status, 400);
  const { data: p } = await A('POST', '/rekomendasi', { body: form });
  assert.equal(p.status, 'draft');
  assert.equal((await A('POST', `/rekomendasi/${p.id}/kirim`)).status, 400); // dokumen wajib belum ada
  assert.equal((await A('POST', `/rekomendasi/${p.id}/dokumen/rangkuman_nilai`, { berkas: Buffer.from('bukan pdf') })).status, 400);
  for (const jenis of ['rangkuman_nilai', 'bukti_pembayaran', 'surat_izin_orang_tua']) {
    assert.equal((await A('POST', `/rekomendasi/${p.id}/dokumen/${jenis}`, { berkas: PDF })).status, 200);
  }
  assert.equal((await A('POST', `/rekomendasi/${p.id}/dokumen/rangkuman_nilai`, { berkas: PDF })).status, 200); // mengganti berkas lama
  assert.equal(storage.isi.size, 3); // berkas lama terhapus dari penyimpanan
  assert.equal((await A('POST', `/rekomendasi/${p.id}/kirim`)).data.status, 'diajukan');
  assert.equal((await A('PUT', `/rekomendasi/${p.id}`, { body: form })).status, 409); // sudah dikirim
  assert.deepEqual((await A('GET', `/rekomendasi/${p.id}`)).data.riwayat.map((x) => x.status), ['draft', 'diajukan']);

  // mahasiswa lain tidak bisa melihat pengajuan ini
  await db.query("INSERT INTO mahasiswa (id_user, npm, ipk, semester, no_telepon, status_aktif, status_cuti, ada_nilai_e) SELECT id_user, '11129999', 3.2, 7, '081200000000', true, false, false FROM users WHERE email = 'b@uji.test'");
  assert.equal((await B('GET', `/rekomendasi/${p.id}`)).status, 404);

  // konversi hanya setelah surat terbit dan periode konversi dibuka
  const konv = { id_pengajuan: p.id, posisi: 'Dev', tgl_mulai: '2026-11-01', tgl_selesai: '2027-01-31' };
  assert.equal((await A('POST', '/konversi', { body: konv })).status, 409);
  await db.query("UPDATE pengajuan_rekomendasi SET status = 'diterbitkan' WHERE id_pengajuan = $1", [p.id]); // tindakan Admin Prodi
  await periode(-1);
  const k = (await A('POST', '/konversi', { body: konv })).data;
  assert.equal((await A('POST', `/konversi/${k.id}/kirim`)).status, 400); // berkas belum ada
  await A('POST', `/konversi/${k.id}/surat-penerimaan`, { berkas: PDF });
  await A('POST', `/konversi/${k.id}/silabus`, { berkas: PDF });
  assert.equal((await A('POST', `/konversi/${k.id}/kirim`)).data.status, 'diajukan');
  assert.equal((await A('POST', '/konversi', { body: konv })).status, 409); // satu per surat

  // hasil konversi dari Admin Prodi tampil di sisi mahasiswa
  await db.query("INSERT INTO mata_kuliah (kode_mk, nama_mk, sks) VALUES ('IT011243', 'Pemrograman Web', 3)");
  await db.query('INSERT INTO detail_konversi (id_konversi, id_matkul, sks_diakui) VALUES ($1, 1, 3)', [k.id]);
  await db.query("UPDATE pengajuan_konversi SET status = 'diproses' WHERE id_konversi = $1", [k.id]); // admin menyetujui; sebelum itu hasil belum terlihat mahasiswa
  assert.deepEqual((await A('GET', `/konversi/${k.id}`)).data.hasil.matkul, [{ kode_mk: 'IT011243', nama_mk: 'Pemrograman Web', sks_diakui: 3 }]);

  // dokumen magang
  const awal = (await A('GET', '/dokumen-magang')).data;
  assert.deepEqual([awal.ada_magang, awal.wajib_total, awal.selesai], [true, 3, false]);
  assert.equal((await A('POST', '/dokumen-magang/logbook', { berkas: PDF })).data.dokumen.find((x) => x.jenis === 'logbook').status, 'menunggu');
  const laporan = (await A('POST', '/dokumen-magang/laporan_akhir', { berkas: PDF })).data;
  assert.equal(laporan.dokumen.find((x) => x.jenis === 'laporan_akhir').status, 'menunggu');
  await db.query("UPDATE dokumen_akhir SET status_periksa = 'disetujui' WHERE jenis_dokumen = 'laporan_akhir'"); // tindakan Dosen
  assert.equal((await A('POST', '/dokumen-magang/laporan_akhir', { berkas: PDF })).status, 409); // terkunci

  const dash = (await A('GET', '/dashboard')).data;
  assert.equal(dash.pengajuan.length, 1);
  assert.equal(dash.sks_konversi, 3);
  const unduh = await fetch(`http://localhost:${server.address().port}/api/mahasiswa/rekomendasi/${p.id}/dokumen/rangkuman_nilai`, { headers: { Authorization: 'Bearer token-a' } });
  assert.equal(unduh.headers.get('content-type'), 'application/pdf');
});

test('unggahan di atas 2 MB ditolak', async () => {
  const besar = Buffer.concat([PDF, Buffer.alloc(2 * 1024 * 1024)]);
  assert.equal((await A('POST', '/dokumen-magang/sertifikat', { berkas: besar })).status, 413);
});

test('periode publik terbaca tanpa login', async () => {
  const d = await (await fetch(`http://localhost:${server.address().port}/api/publik/periode`)).json();
  assert.equal(d.tersedia, true);
  assert.ok(d.kategori_diizinkan.includes('BUMN'));
  assert.ok(!d.kategori_diizinkan.includes('Swasta'));
});

test('anti-spam: maksimal 3 kali kirim surat rekomendasi per 7 hari, pengajuan ditolak tetap dihitung', async () => {
  await periode(30);
  const { data: p } = await A('POST', '/rekomendasi', { body: { ...form, nama_perusahaan: 'PT Spam' } });
  for (const jenis of ['rangkuman_nilai', 'bukti_pembayaran', 'surat_izin_orang_tua']) await A('POST', `/rekomendasi/${p.id}/dokumen/${jenis}`, { berkas: PDF });
  const { rows: [u] } = await db.query("SELECT id_user FROM users WHERE email = 'a@uji.test'");
  const catat = (hariLalu) => db.query("INSERT INTO riwayat_status (jenis_objek, id_objek, status_baru, diubah_oleh, diubah_pada) VALUES ('pengajuan_rekomendasi', 999, 'diajukan', $1, now() - make_interval(days => $2))", [u.id_user, hariLalu]);
  await catat(8); // di luar jendela 7 hari: tidak dihitung
  await catat(2); // total dalam 7 hari: 1 (alur utama) + 1 = 2
  const ketiga = await A('POST', `/rekomendasi/${p.id}/kirim`);
  assert.equal(ketiga.status, 200); // pengiriman ke-3 masih boleh
  await db.query("UPDATE pengajuan_rekomendasi SET status = 'draft' WHERE id_pengajuan = $1", [p.id]); // seolah ditolak/dikembalikan lalu dikirim ulang
  const keempat = await A('POST', `/rekomendasi/${p.id}/kirim`);
  assert.equal(keempat.status, 429);
  assert.match(keempat.data.error, /maksimal 3 kali per 7 hari/);
});

test('logbook: unggah PDF opsional; notifikasi mahasiswa', async () => {
  assert.equal((await A('GET', '/dokumen-magang')).data.template_laporan_tersedia, false);
  assert.equal((await A('GET', '/dokumen-magang/laporan_akhir/template')).status, 404);

  await db.query("INSERT INTO riwayat_status (jenis_objek, id_objek, status_lama, status_baru) SELECT 'pengajuan_konversi', max(id_konversi), 'diproses', 'diterbitkan' FROM pengajuan_konversi");
  const n = (await A('GET', '/notifikasi')).data;
  assert.ok(n.belum_dibaca > 0 && n.item.some((x) => x.judul === 'Konversi SKS disetujui'));
  await A('POST', '/notifikasi/baca');
  assert.equal((await A('GET', '/notifikasi')).data.belum_dibaca, 0);
});
