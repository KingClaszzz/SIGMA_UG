// Akses PostgreSQL (Supabase). Antarmuka kecil { query, transaksi } supaya tes bisa memakai PGlite.
import pg from 'pg';

pg.types.setTypeParser(1082, (v) => v); // DATE tetap berupa teks YYYY-MM-DD, tidak bergeser zona waktu
pg.types.setTypeParser(1700, parseFloat); // NUMERIC (ipk)
pg.types.setTypeParser(20, Number); // BIGINT (hasil count)

export function dbDariUrl(url) {
  // max kecil: Supabase pooler membatasi koneksi, dan satu server cukup untuk 100 pengguna (NFR-01).
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return {
    query: (sql, params) => pool.query(sql, params),
    async transaksi(fn) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const hasil = await fn(c);
        await c.query('COMMIT');
        return hasil;
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    },
  };
}
