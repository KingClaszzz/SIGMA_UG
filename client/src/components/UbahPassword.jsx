// Dialog "Ubah Password" untuk pengguna yang sedang masuk (dipakai semua peran). Supabase Auth yang menyimpan kata sandi.
import { useState } from 'react';
import { supabase } from '../supabase';
import { pesanAuth } from '../auth/sesi';
import Dialog from './Dialog.jsx';
import { beritahu } from './Pemberitahuan.jsx';

export default function UbahPassword({ onTutup }) {
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  async function kirim(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    if (f.get('baru') !== f.get('ulang')) return setGalat('Kata sandi dan konfirmasinya tidak sama.');
    setSibuk(true);
    setGalat(null);
    const { error } = await supabase.auth.updateUser({ password: f.get('baru') });
    setSibuk(false);
    if (error) return setGalat(pesanAuth(error));
    beritahu({ judul: 'Kata sandi diubah', teks: 'Gunakan kata sandi baru saat masuk berikutnya.' });
    onTutup();
  }
  return (
    <Dialog judul="Ubah Password" onTutup={onTutup}>
      <form className="aksi-form" style={{ marginTop: 0 }} onSubmit={kirim}>
        <label>Kata sandi baru (minimal 8 karakter)<input name="baru" type="password" minLength={8} required autoComplete="new-password" /></label>
        <label>Ulangi kata sandi baru<input name="ulang" type="password" minLength={8} required autoComplete="new-password" /></label>
        {galat && <p className="pesan galat" role="alert">{galat}</p>}
        <div className="dialog-aksi">
          <button type="button" className="btn garis" onClick={onTutup}>Batal</button>
          <button type="submit" className="btn isi" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </Dialog>
  );
}
