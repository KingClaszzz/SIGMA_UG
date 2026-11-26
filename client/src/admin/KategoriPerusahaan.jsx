import Muat from '../components/Muat.jsx';
// PERAN: ADMIN PRODI — manajemen kategori perusahaan mitra (FR-03 / BR-02; SDD tabel 8).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useAksi, useApi } from '../api';
import Dialog from '../components/Dialog.jsx';

export default function KategoriPerusahaan() {
  const { data, error, muat } = useApi('/admin/kategori-perusahaan');
  const [form, setForm] = useState({ nama_kategori: '', is_diizinkan: true });
  const [ubah, setUbah] = useState(null);
  const { sibuk, galat, jalan } = useAksi(muat);

  return (
    <div className="halaman" style={{ maxWidth: 920 }}>
      <Link to="/admin/profil" className="kembali">← Kembali ke Profil</Link>
      <header className="masuk">
        <h1 className="judul">Kategori Perusahaan</h1>
        <p className="sub">Kelola kategori instansi/perusahaan yang diizinkan untuk pengajuan surat rekomendasi magang.</p>
      </header>

      <form
        className="kartu"
        onSubmit={(e) => {
          e.preventDefault();
          jalan(async () => {
            await api('/admin/kategori-perusahaan', { method: 'POST', body: form });
            setForm({ nama_kategori: '', is_diizinkan: true });
          }, { judul: 'Kategori ditambahkan' });
        }}
      >
        <h2>Tambah kategori</h2>
        <div className="grid-form">
          <label className="penuh">
            Nama kategori *
            <input required maxLength={50} placeholder="Contoh: Perusahaan Multinasional" value={form.nama_kategori} onChange={(e) => setForm({ ...form, nama_kategori: e.target.value })} />
          </label>
          <label className="penuh" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={form.is_diizinkan} onChange={(e) => setForm({ ...form, is_diizinkan: e.target.checked })} />
            Diizinkan untuk pengajuan magang
          </label>
        </div>
        {galat && <p className="pesan galat" role="alert" style={{ marginTop: 14 }}>{galat}</p>}
        <div className="baris-aksi"><span /><button className="btn isi" type="submit" disabled={sibuk}>Tambah</button></div>
      </form>

      <section className="kartu">
        <h2>Daftar kategori perusahaan</h2>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.length === 0 ? (
          <p className="kosong">Belum ada kategori perusahaan.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>No</th><th>Nama Kategori</th><th>Status</th><th>Dipakai</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((k, i) => (
                  <tr key={k.id}>
                    <td>{i + 1}</td>
                    <td>{k.nama_kategori}</td>
                    <td><span className={`badge ${k.is_diizinkan ? 'hijau' : 'merah'}`}>{k.is_diizinkan ? 'Diizinkan' : 'Tidak Diizinkan'}</span></td>
                    <td>{k.dipakai} pengajuan</td>
                    <td className="td-aksi">
                      <button
                        type="button"
                        className="btn garis kecil"
                        disabled={sibuk}
                        onClick={() => jalan(() => api(`/admin/kategori-perusahaan/${k.id}`, {
                          method: 'PUT',
                          body: { nama_kategori: k.nama_kategori, is_diizinkan: !k.is_diizinkan },
                        }), { judul: k.is_diizinkan ? 'Kategori ditandai tidak diizinkan' : 'Kategori diizinkan' })}
                      >
                        {k.is_diizinkan ? 'Nonaktifkan' : 'Izinkan'}
                      </button>
                      <button type="button" className="btn garis kecil" disabled={sibuk} onClick={() => setUbah({ ...k })}>Edit</button>
                      <button
                        type="button"
                        className="btn garis kecil bahaya"
                        disabled={sibuk || k.dipakai > 0}
                        title={k.dipakai > 0 ? 'Sudah dipakai pada pengajuan rekomendasi' : undefined}
                        onClick={() => jalan(() => api(`/admin/kategori-perusahaan/${k.id}`, { method: 'DELETE' }), { judul: 'Kategori dihapus' })}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ubah && (
        <Dialog judul="Edit Kategori Perusahaan" onTutup={() => setUbah(null)}>
          <form
            className="aksi-form"
            style={{ marginTop: 0 }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (await jalan(() => api(`/admin/kategori-perusahaan/${ubah.id}`, {
                method: 'PUT',
                body: { nama_kategori: ubah.nama_kategori, is_diizinkan: ubah.is_diizinkan },
              }), { judul: 'Kategori diperbarui' })) setUbah(null);
            }}
          >
            <label>
              Nama kategori *
              <input required maxLength={50} value={ubah.nama_kategori} onChange={(e) => setUbah({ ...ubah, nama_kategori: e.target.value })} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={ubah.is_diizinkan} onChange={(e) => setUbah({ ...ubah, is_diizinkan: e.target.checked })} />
              Diizinkan untuk pengajuan magang
            </label>
            <div className="dialog-aksi">
              <button type="button" className="btn garis" onClick={() => setUbah(null)}>Batal</button>
              <button type="submit" className="btn isi" disabled={sibuk}>Simpan</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
