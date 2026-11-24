// RUTE PUBLIK (tanpa login): dipakai landing page dan semua peran untuk membaca periode.
import express from 'express';
import { jadwal } from '../rules.js';

export default function routerPublik({ db }) {
  const r = express.Router();

  r.get('/periode', async (_req, res) => {
    const { rows } = await db.query("SELECT * FROM periode_magang WHERE status = 'dipublikasikan' ORDER BY id_periode DESC LIMIT 1");
    const kategori = await db.query('SELECT nama_kategori FROM kategori_perusahaan WHERE is_diizinkan ORDER BY id_kategori');
    const p = rows[0];
    res.json({
      tersedia: !!p,
      ...p,
      jadwal: p ? jadwal(p) : [],
      kategori_diizinkan: kategori.rows.map((k) => k.nama_kategori),
    });
  });

  // Cek NPM sebelum daftar (tanpa login): satu NPM hanya boleh dipakai satu akun.
  r.get('/npm/:npm', async (req, res) => {
    if (!/^\d{8}$/.test(req.params.npm)) return res.status(400).json({ error: 'NPM harus 8 digit angka.' });
    const { rows } = await db.query('SELECT 1 FROM mahasiswa WHERE npm = $1', [req.params.npm]);
    res.json({ tersedia: rows.length === 0 });
  });

  return r;
}
