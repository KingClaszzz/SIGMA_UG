export class Galat extends Error {
  constructor(status, pesan) {
    super(pesan);
    this.status = status;
  }
}

export const salah = (pesan) => {
  if (pesan) throw new Galat(400, pesan);
};

// Mengirim PDF sebagai tampilan di browser.
export function kirimPdf(res, buffer, nama) {
  res.type('pdf').set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(nama)}`).send(buffer);
}

export const q = async (c, sql, params) => (await c.query(sql, params)).rows;
export const satu = async (c, sql, params) => (await c.query(sql, params)).rows[0];
export const iso = (d) => (d instanceof Date ? d.toISOString() : d);

// Setiap perubahan status dicatat di riwayat_status (SDD tabel 19), yang juga menjadi garis waktu di UI semua peran.
const OBJEK = {
  pengajuan_rekomendasi: ['pengajuan_rekomendasi', 'id_pengajuan'],
  pengajuan_konversi: ['pengajuan_konversi', 'id_konversi'],
};
export async function catat(c, jenis, id, lama, baru, idUser) {
  const [tabel, kunci] = OBJEK[jenis];
  await c.query(`UPDATE ${tabel} SET status = $1 WHERE ${kunci} = $2`, [baru, id]);
  await c.query('INSERT INTO riwayat_status (jenis_objek, id_objek, status_lama, status_baru, diubah_oleh) VALUES ($1, $2, $3, $4, $5)', [jenis, id, lama, baru, idUser]);
}
export const riwayatDari = (rows, jenis, id) => rows.filter((r) => r.jenis_objek === jenis && r.id_objek === id).map((r) => ({ status: r.status_baru, pada: iso(r.diubah_pada) }));
