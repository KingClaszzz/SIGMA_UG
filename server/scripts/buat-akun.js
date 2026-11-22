// Membuat akun Admin Prodi atau Dosen Pendamping (FR-01: akun dibuat tim pengembang, bukan mendaftar sendiri).
// Pemakaian dari folder server:
//   node --env-file=.env scripts/buat-akun.js admin  email@kampus.ac.id "Nama Lengkap" PASSWORD NIP "Jabatan" 08xxxxxxxxxx
//   node --env-file=.env scripts/buat-akun.js dosen  email@kampus.ac.id "Nama Lengkap" PASSWORD NIDN 08xxxxxxxxxx
// Bila email sudah terdaftar, akunnya dipakai ulang dan hanya peran/profilnya yang diatur.
import { createClient } from '@supabase/supabase-js';
import { dbDariUrl } from '../db.js';

const [peran, email, nama, password, nomorInduk, ...sisa] = process.argv.slice(2);
const jabatan = peran === 'admin' ? sisa[0] : null;
const telepon = peran === 'admin' ? sisa[1] : sisa[0];
if (!['admin', 'dosen'].includes(peran) || !email || !nama || !password || !nomorInduk || !telepon || (peran === 'admin' && !jabatan) || password.length < 8) {
  console.error('Pemakaian: lihat komentar di atas berkas ini. Kata sandi minimal 8 karakter.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const db = dbDariUrl(process.env.DATABASE_URL);

let { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nama } });
if (error) {
  if (!/already|registered/i.test(error.message)) throw error;
  const { data: daftar } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  data = { user: daftar.users.find((u) => u.email === email) };
  console.log('Email sudah ada di Supabase Auth, memakai akun yang ada (kata sandi tidak diubah).');
}

await db.transaksi(async (c) => {
  const { rows: [u] } = await c.query(
    `INSERT INTO users (auth_id, email, nama, peran) VALUES ($1, $2, $3, $4)
     ON CONFLICT (auth_id) DO UPDATE SET peran = EXCLUDED.peran, nama = EXCLUDED.nama RETURNING id_user`, [data.user.id, email, nama.slice(0, 60), peran]);
  if (peran === 'admin') await c.query('INSERT INTO admin (id_user, nip, jabatan, no_telepon) VALUES ($1, $2, $3, $4) ON CONFLICT (id_user) DO UPDATE SET nip = EXCLUDED.nip, jabatan = EXCLUDED.jabatan, no_telepon = EXCLUDED.no_telepon', [u.id_user, nomorInduk, jabatan, telepon]);
  else await c.query('INSERT INTO dosen (id_user, nidn, no_telepon) VALUES ($1, $2, $3) ON CONFLICT (id_user) DO UPDATE SET nidn = EXCLUDED.nidn, no_telepon = EXCLUDED.no_telepon', [u.id_user, nomorInduk, telepon]);
});
console.log(`Akun ${peran} siap: ${email}`);
process.exit(0);
