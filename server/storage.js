// Penyimpanan berkas PDF. Produksi: Supabase Storage (bucket privat). Pengembangan/tes: folder lokal.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function storageSupabase(supabase, bucket) {
  const wadah = () => supabase.storage.from(bucket);
  return {
    async simpan(buffer, folder, { ekstensi = 'pdf', tipe = 'application/pdf' } = {}) {
      const lokasi = `${folder}/${crypto.randomUUID()}.${ekstensi}`;
      const { error } = await wadah().upload(lokasi, buffer, { contentType: tipe });
      if (error) throw new Error(`Gagal menyimpan berkas: ${error.message}`);
      return lokasi;
    },
    async hapus(lokasi) {
      if (lokasi) await wadah().remove([lokasi]);
    },
    async baca(lokasi) {
      const { data, error } = await wadah().download(lokasi);
      if (error) throw new Error(`Gagal membaca berkas: ${error.message}`);
      return Buffer.from(await data.arrayBuffer());
    },
  };
}

export function storageLokal(dir) {
  const penuh = (lokasi) => path.join(dir, ...lokasi.split('/'));
  return {
    async simpan(buffer, folder, { ekstensi = 'pdf' } = {}) {
      const lokasi = `${folder}/${crypto.randomUUID()}.${ekstensi}`;
      await fs.mkdir(path.dirname(penuh(lokasi)), { recursive: true });
      await fs.writeFile(penuh(lokasi), buffer);
      return lokasi;
    },
    async hapus(lokasi) {
      if (lokasi) await fs.rm(penuh(lokasi), { force: true });
    },
    baca: (lokasi) => fs.readFile(penuh(lokasi)),
  };
}
