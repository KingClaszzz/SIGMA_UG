import test from 'node:test';
import assert from 'node:assert/strict';
import { jadwal, statusRentang, validasiProfil } from './rules.js';

test('status rentang mengikuti tanggal buka dan tutup', () => {
  assert.equal(statusRentang('2026-07-01', '2026-08-31', '2026-06-30'), 'akan_dibuka');
  assert.equal(statusRentang('2026-07-01', '2026-08-31', '2026-08-31'), 'dibuka');
  assert.equal(statusRentang('2026-07-01', '2026-08-31', '2026-09-01'), 'ditutup');
});

test('jendela konversi dimulai sehari setelah pengajuan surat ditutup', () => {
  const [, konversi] = jadwal({ tgl_buka: '2026-07-01', tgl_tutup: '2026-08-31', batas_konversi: '2026-10-31' }, '2026-09-15');
  assert.deepEqual([konversi.buka, konversi.tutup, konversi.status], ['2026-09-01', '2026-10-31', 'dibuka']);
});

test('validasi profil menolak IPK di luar 0–4 dan telepon salah', () => {
  const ok = { ipk: '3.5', jumlah_sks: '100', semester: '7', no_telepon: '081234567890', alamat: 'Jl. Margonda Raya No. 100, Depok' };
  assert.equal(validasiProfil(ok), null);
  assert.match(validasiProfil({ ...ok, ipk: '4.5' }), /IPK/);
  assert.match(validasiProfil({ ...ok, no_telepon: '12345' }), /telepon/);
  assert.match(validasiProfil({ ...ok, alamat: 'Depok' }), /Alamat/);
});
