import test from 'node:test';
import assert from 'node:assert/strict';
import { buatApp } from '../app.js';
import { buatDbUji, storageUji } from './dbUji.js';

const db = await buatDbUji();
const identitas = { 'token-a': { auth_id: '11111111-1111-4111-8111-111111111111', email: 'a@uji.test', nama: 'A' } };
const server = buatApp({ db, storage: storageUji(), verifikasi: async (t) => identitas[t] ?? null, batas: { gagalAuth: { jendelaMs: 60_000, maks: 3 }, tulis: { jendelaMs: 60_000, maks: 5 } } }).listen(0);
test.after(() => server.close());
const dasar = () => `http://localhost:${server.address().port}/api`;
const req = (token, method, rute, body) => fetch(`${dasar()}${rute}`, { method, headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { 'Content-Type': 'application/json' }) }, body: body && JSON.stringify(body) });

test('header keamanan terpasang dan tidak membocorkan teknologi', async () => {
  const res = await fetch(`${dasar()}/publik/periode`);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('id bukan angka dijawab 400, bukan 500; JSON rusak 400', async () => {
  await db.query("INSERT INTO users (auth_id, email, nama, peran) VALUES ('11111111-1111-4111-8111-111111111111', 'a@uji.test', 'A', 'admin')");
  await db.query("INSERT INTO admin (id_user, nip, jabatan, no_telepon) SELECT id_user, '1', 'CP', '0812' FROM users");
  assert.equal((await req('token-a', 'GET', '/admin/rekomendasi/abc')).status, 400);
  assert.equal((await req('token-a', 'GET', "/admin/rekomendasi?q=' OR 1=1 --&status=diajukan';DROP TABLE users")).status, 200); // tidak ada SQL dinamis dari input
  assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n, 1);
  const rusak = await fetch(`${dasar()}/admin/periode`, { method: 'POST', headers: { Authorization: 'Bearer token-a', 'Content-Type': 'application/json' }, body: '{rusak' });
  assert.equal(rusak.status, 400);
});

test('token salah berulang dari satu IP diblokir sementara (429)', async () => {
  const hasil = [];
  for (let i = 0; i < 5; i++) hasil.push((await req('token-ngawur', 'GET', '/saya')).status);
  assert.deepEqual(hasil, [401, 401, 401, 429, 429]);
  assert.ok((await req('token-a', 'GET', '/saya')).status === 429); // IP yang sama ikut terblokir sementara
});
