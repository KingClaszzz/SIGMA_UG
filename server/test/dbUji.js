// Basis data uji: PostgreSQL sungguhan dalam proses (PGlite) memakai skema yang sama dengan Supabase.
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

export async function buatDbUji() {
  const pg = new PGlite({ parsers: { 1082: (v) => v, 1700: parseFloat, 20: Number } });
  await pg.exec(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  return {
    query: (sql, params) => pg.query(sql, params),
    transaksi: (fn) => pg.transaction((tx) => fn({ query: (sql, params) => tx.query(sql, params) })),
  };
}

// Penyimpanan berkas di memori, antarmuka sama dengan storage.js.
export function storageUji() {
  const isi = new Map();
  let n = 0;
  return {
    isi,
    async simpan(buffer, folder) {
      const lokasi = `${folder}/${++n}.pdf`;
      isi.set(lokasi, buffer);
      return lokasi;
    },
    async hapus(lokasi) {
      isi.delete(lokasi);
    },
    async baca(lokasi) {
      return isi.get(lokasi);
    },
  };
}
