// PERAN: ADMIN PRODI — daftar mata kuliah yang bisa dipilih sebagai hasil konversi (FR-07; SDD tabel 12).
import { useState } from 'react';
import { api, useAksi, useApi } from '../api';

export default function MataKuliah() {
  const { data, error, muat } = useApi('/admin/mata-kuliah');
  const [form, setForm] = useState({ kode_mk: '', nama_mk: '', sks: '3' });
  const { sibuk, galat, jalan } = useAksi(muat);
  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="halaman" style={{ maxWidth: 860 }}>
      <header className="masuk">
        <h1 className="judul">Mata Kuliah</h1>
        <p className="sub">Mata kuliah yang bisa dipilih saat menentukan hasil konversi SKS. Mata kuliah yang sudah dipakai tidak bisa dihapus.</p>
      </header>

      <form className="kartu" onSubmit={(e) => { e.preventDefault(); jalan(async () => { await api('/admin/mata-kuliah', { method: 'POST', body: form }); setForm({ kode_mk: '', nama_mk: '', sks: '3' }); }); }}>
        <h2>Tambah mata kuliah</h2>
        <div className="grid-form tiga">
          <label>Kode *<input required minLength={3} maxLength={15} placeholder="IT011243" value={form.kode_mk} onChange={ubah('kode_mk')} /></label>
          <label>Nama *<input required maxLength={50} placeholder="Pemrograman Web" value={form.nama_mk} onChange={ubah('nama_mk')} /></label>
          <label>SKS *<input type="number" required min="1" max="6" value={form.sks} onChange={ubah('sks')} /></label>
        </div>
        {galat && <p className="pesan galat" role="alert" style={{ marginTop: 14 }}>{galat}</p>}
        <div className="baris-aksi"><span /><button className="btn isi" type="submit" disabled={sibuk}>Tambah</button></div>
      </form>

      <section className="kartu">
        <h2>Daftar mata kuliah</h2>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <p className="kosong">Memuat…</p> : data.length === 0 ? (
          <p className="kosong">Belum ada mata kuliah.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Kode</th><th>Nama</th><th>SKS</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id}>
                    <td>{m.kode_mk}</td><td>{m.nama_mk}</td><td>{m.sks}</td>
                    <td><button className="btn garis kecil" style={{ color: 'var(--red-fg)', borderColor: 'var(--red-fg)' }} disabled={sibuk} onClick={() => jalan(() => api(`/admin/mata-kuliah/${m.id}`, { method: 'DELETE' }))}>Hapus</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
