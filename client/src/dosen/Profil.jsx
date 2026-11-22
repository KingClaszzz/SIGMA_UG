// PERAN: DOSEN PENDAMPING — profil: data dosen, ubah nomor telepon, dan ubah password. NIDN dan email ditetapkan Admin Prodi.
import { useState } from 'react';
import { api, useAksi, useApi } from '../api';
import Dialog from '../components/Dialog.jsx';
import UbahPassword from '../components/UbahPassword.jsx';
import { inisial } from './DosenShell.jsx';

export default function ProfilDosen() {
  const { data: p, error, muat } = useApi('/dosen/profil');
  const [dialog, setDialog] = useState(null); // 'profil' | 'sandi'
  const [telepon, setTelepon] = useState('');
  const { sibuk, galat, jalan } = useAksi(muat);
  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!p) return <p className="sub">Memuat…</p>;
  return (
    <div className="halaman admin-lebar">
      <section className="kartu profil-kepala masuk">
        <span className="avatar-besar" aria-hidden="true">{inisial(p.nama)}</span>
        <div style={{ flex: 1 }}>
          <h1 className="judul" style={{ fontSize: 22 }}>{p.nama}</h1>
          <p className="sub">NIDN {p.nidn}</p>
          <div className="baris-kecil"><span className="badge ungu">Dosen Pendamping</span><span className="badge hijau">Akun Aktif</span></div>
        </div>
        <button className="btn isi kecil" onClick={() => { setTelepon(p.no_telepon); setDialog('profil'); }}>Edit Profil</button>
      </section>
      <section className="kartu">
        <h2>Data Dosen</h2>
        <dl className="kv-polos">
          <div className="kv"><dt>Email</dt><dd>{p.email}</dd></div><div className="kv"><dt>Nomor telepon</dt><dd>{p.no_telepon}</dd></div>
          <div className="kv"><dt>Fakultas</dt><dd>Ilmu Komputer dan Teknologi Informasi</dd></div><div className="kv"><dt>Program Studi</dt><dd>Sistem Informasi</dd></div>
        </dl>
      </section>
      <section className="kartu" style={{ maxWidth: 520 }}>
        <h2>Pengaturan Akun</h2>
        <p className="isi">{p.email} <span className="badge hijau">Terverifikasi</span></p>
        <button className="btn garis" style={{ marginTop: 12 }} onClick={() => setDialog('sandi')}>Ubah Password</button>
      </section>

      {dialog === 'sandi' && <UbahPassword onTutup={() => setDialog(null)} />}
      {dialog === 'profil' && (
        <Dialog judul="Edit Profil" onTutup={() => setDialog(null)}>
          <form className="aksi-form" style={{ marginTop: 0 }} onSubmit={async (e) => { e.preventDefault(); if (await jalan(() => api('/dosen/profil', { method: 'PUT', body: { no_telepon: telepon } }), { judul: 'Profil diperbarui' })) setDialog(null); }}>
            <label>Nomor telepon<input type="tel" required pattern="08[0-9]{8,11}" title="10–13 digit, diawali 08" value={telepon} onChange={(e) => setTelepon(e.target.value)} /></label>
            <p className="catatan-kecil" style={{ marginTop: 0 }}>Nama, NIDN, dan email diatur Admin Prodi.</p>
            {galat && <p className="pesan galat" role="alert">{galat}</p>}
            <div className="dialog-aksi"><button type="button" className="btn garis" onClick={() => setDialog(null)}>Batal</button><button className="btn isi" type="submit" disabled={sibuk}>Simpan</button></div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
