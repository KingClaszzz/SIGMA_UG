import express from 'express';
import { Galat } from './lib.js';
import { pembatas } from './batas.js';
import { buatLayananEmail } from './email.js';
import routerPublik from './routes/publik.js';
import routerMahasiswa from './routes/mahasiswa.js';
import routerAdmin from './routes/admin.js';
import routerDosen from './routes/dosen.js';

// Pengguna dikenali dari token Supabase Auth. Baris users dibuat otomatis (peran mahasiswa) saat pertama masuk;
// akun admin dan dosen dibuat tim pengembang dengan mengisi users.peran (FR-01).
// Satu akun hanya boleh dipakai di satu perangkat. users.sesi_id = sesi Supabase yang sedang memegang akun, users.last_login = aktivitas terakhirnya
// (klien mengirim denyut tiap 2 menit selama halaman terbuka). Perangkat lain ditolak selama pemegang masih aktif; bila pemegang sudah diam
// lebih dari SESI_DIAM_MS (peramban ditutup tanpa keluar), akun boleh diambil alih. Keluar melepaskan akun.
export const SESI_DIAM_MS = 5 * 60_000;
async function satuPerangkat(db, user, sesi) {
  if (!sesi) return;
  const sekarang = Date.now();
  const diam = !user.last_login || sekarang - new Date(user.last_login).getTime() > SESI_DIAM_MS;
  if (user.sesi_id && user.sesi_id !== sesi && !diam) {
    throw new Galat(409, 'Akun ini sedang digunakan di perangkat lain. Silakan keluar (logout) dari perangkat tersebut terlebih dahulu.', 'SESI_LAIN');
  }
  // Tulis hanya bila berganti sesi atau aktivitas terakhir sudah lewat semenit, supaya tidak menulis di setiap permintaan.
  if (user.sesi_id !== sesi || diam || sekarang - new Date(user.last_login).getTime() > 60_000) {
    await db.query('UPDATE users SET sesi_id = $1, last_login = now() WHERE id_user = $2', [sesi, user.id_user]);
    user.sesi_id = sesi;
  }
}

function autentikasi({ db, verifikasi, gagalAuth }) {
  return async (req, res, next) => {
    // Token salah berulang dari satu alamat IP (menebak token) diblokir sementara.
    if (gagalAuth.penuh(req.ip)) return gagalAuth.tolak(res, gagalAuth.isi(req.ip));
    const token = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new Galat(401, 'Silakan masuk terlebih dahulu.');
    const id = await verifikasi(token);
    if (!id) {
      gagalAuth.catat(req.ip);
      throw new Galat(401, 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.');
    }
    const emailPengguna = id.email.trim().toLowerCase();
    let { rows: [user] } = await db.query('SELECT * FROM users WHERE auth_id = $1', [id.auth_id]);
    if (!user) {
      try {
        ({ rows: [user] } = await db.query(
          `INSERT INTO users (auth_id, email, nama, peran) VALUES ($1, $2, $3, 'mahasiswa')
           ON CONFLICT (auth_id) DO UPDATE SET auth_id = EXCLUDED.auth_id RETURNING *`,
          [id.auth_id, emailPengguna, id.nama.trim().slice(0, 60) || emailPengguna.split('@')[0]],
        ));
      } catch (e) {
        if (e.code === '23505') throw new Galat(409, 'Email ini sudah terdaftar pada akun lain. Masuk menggunakan metode awal atau hubungi Admin Prodi.');
        throw e;
      }
    }
    if (!user.is_aktif) throw new Galat(403, 'Akun dinonaktifkan. Hubungi Admin Prodi.');
    await satuPerangkat(db, user, id.sesi);
    req.user = user;
    next();
  };
}

const wajibPeran = (peran) => (req, _res, next) => {
  if (req.user.peran !== peran) throw new Galat(403, 'Anda tidak memiliki akses ke halaman ini.');
  next();
};

// Batas laju bawaan; tes boleh mengecilkannya lewat parameter `batas`.
const BATAS_BAWAAN = {
  ip: { jendelaMs: 60_000, maks: 600 }, // semua permintaan per alamat IP
  gagalAuth: { jendelaMs: 5 * 60_000, maks: 60 }, // token salah per IP
  tulis: { jendelaMs: 10 * 60_000, maks: 90 }, // POST/PUT/DELETE per pengguna (admin dihitung lebih longgar di bawah)
};

export function buatApp({ db, storage, verifikasi, akun, kirimEmail = null, batas = {} }) {
  const b = { ...BATAS_BAWAAN, ...batas };
  const email = buatLayananEmail({ db, kirimEmail });
  const app = express();
  app.disable('x-powered-by');
  // Di belakang reverse proxy, isi TRUST_PROXY (jumlah proxy) agar req.ip adalah IP pengunjung, bukan IP proxy.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", // API hanya melayani JSON/PDF
      'Cache-Control': 'no-store', // data pribadi tidak boleh tersimpan di cache bersama
      ...(process.env.NODE_ENV === 'production' && { 'Strict-Transport-Security': 'max-age=15552000; includeSubDomains' }),
    });
    next();
  });
  app.use('/api', pembatas({ ...b.ip, kunci: (req) => req.ip }));
  app.use(express.json({ limit: '100kb' }));
  const gagalAuth = pembatas({ ...b.gagalAuth, kunci: (req) => req.ip });

  app.use('/api/publik', routerPublik({ db }));
  const masuk = autentikasi({ db, verifikasi, gagalAuth });
  // Tindakan menulis dibatasi per pengguna (anti-spam); admin mendapat batas 5x lebih longgar karena memproses banyak pengajuan.
  const tulis = pembatas({ ...b.tulis, kunci: (req) => `u${req.user.id_user}`, lewati: (req) => req.method === 'GET', pesan: 'Terlalu banyak tindakan dalam waktu singkat. Tunggu beberapa menit lalu coba lagi.' });
  const tulisAdmin = pembatas({ ...b.tulis, maks: b.tulis.maks * 5, kunci: (req) => `u${req.user.id_user}`, lewati: (req) => req.method === 'GET' });
  app.get('/api/saya', masuk, (req, res) => res.json({ peran: req.user.peran, nama: req.user.nama, email: req.user.email }));
<<<<<<< HEAD
  // Keluar: lepaskan akun supaya bisa dipakai di perangkat lain tanpa menunggu.
  app.post('/api/keluar', masuk, async (req, res) => {
    await db.query('UPDATE users SET sesi_id = NULL WHERE id_user = $1', [req.user.id_user]);
    res.json({ ok: true });
  });
  app.use('/api/mahasiswa', masuk, wajibPeran('mahasiswa'), tulis, routerMahasiswa({ db, storage }));
  app.use('/api/admin', masuk, wajibPeran('admin'), tulisAdmin, routerAdmin({ db, storage, akun }));
  app.use('/api/dosen', masuk, wajibPeran('dosen'), tulisAdmin, routerDosen({ db, storage }));
=======
  app.use('/api/mahasiswa', masuk, wajibPeran('mahasiswa'), tulis, routerMahasiswa({ db, storage, email }));
  app.use('/api/admin', masuk, wajibPeran('admin'), tulisAdmin, routerAdmin({ db, storage, akun, email }));
  app.use('/api/dosen', masuk, wajibPeran('dosen'), tulisAdmin, routerDosen({ db, storage, email }));
>>>>>>> 83f9885f73b0f66df0b1e9fa1a56ecb4f63a8278

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Alamat tidak ditemukan.' }));

  // Galat yang disengaja membawa status; sisanya dicatat dan dijawab 500 tanpa membocorkan detail.
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Ukuran berkas maksimal 2 MB.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Permintaan tidak valid.' });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message, ...(err.kode && { kode: err.kode }) });
    // Nilai yang tak bisa dibaca basis data (mis. id bukan angka) adalah salah masukan, bukan galat server.
    if (['22P02', '22003', '22007', '22008'].includes(err.code)) return res.status(400).json({ error: 'Permintaan tidak valid.' });
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  });

  return app;
}
