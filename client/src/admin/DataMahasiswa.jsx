import Muat from '../components/Muat.jsx';
// PERAN: ADMIN PRODI — verifikasi data diri mahasiswa (FR-16; UI-12). Daftar mahasiswa ada di Manajemen Akun, tab Mahasiswa (admin/Akun.jsx). Sistem belum terhubung ke StudentSite, jadi admin mencocokkan
// data yang diisi mahasiswa dengan data akademik resmi sebelum pengajuannya bisa divalidasi.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useAksi, useApi } from '../api';
import Badge from '../components/Badge.jsx';

const ya = (v) => (v ? 'Ya' : 'Tidak');

export function DetailMahasiswa() {
  const { id } = useParams();
  const { data: m, error, muat } = useApi(`/admin/mahasiswa/${id}`);
  const [catatan, setCatatan] = useState('');
  const [yakinLepas, setYakinLepas] = useState(false);
  const navigate = useNavigate();
  const { sibuk, galat, jalan } = useAksi(muat);
  const verifikasi = (status) => jalan(() => api(`/admin/mahasiswa/${id}/verifikasi`, { method: 'PUT', body: { status, catatan } }),
    status === 'terverifikasi' ? { judul: 'Data diri terverifikasi', teks: 'Pengajuan mahasiswa kini bisa divalidasi.' } : { jenis: 'info', judul: 'Ditandai tidak sesuai', teks: 'Catatan dikirim agar mahasiswa memperbaiki data diri.' });

  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!m) return <Muat />;

  return (
    <div className="halaman" style={{ maxWidth: 860 }}>
      <Link to="/admin/akun?tab=mahasiswa" className="kembali">← Kembali ke Manajemen Akun</Link>
      <header className="masuk">
        <h1 className="judul">{m.nama}</h1>
        <p className="sub">{m.npm} · {m.email}</p>
      </header>
      {galat && <p className="banner-galat" role="alert">{galat}</p>}

      <section className="kartu">
        <div className="kartu-kepala"><h2>Data diri</h2><Badge nilai={m.status_verifikasi} /></div>
        {m.catatan_verifikasi && <p className="banner-peringatan" style={{ margin: '12px 0' }}>Catatan sebelumnya: {m.catatan_verifikasi}</p>}
        <dl className="kv-grid" style={{ marginTop: 12 }}>
          <div className="kv"><dt>IPK</dt><dd>{Number(m.ipk).toFixed(2)}</dd></div>
          <div className="kv"><dt>Semester</dt><dd>{m.semester}</dd></div>
          <div className="kv"><dt>Nomor telepon</dt><dd>{m.no_telepon}</dd></div>
          <div className="kv"><dt>Mahasiswa aktif</dt><dd>{ya(m.status_aktif)}</dd></div>
          <div className="kv"><dt>Pernah cuti</dt><dd>{ya(m.status_cuti)}</dd></div>
          <div className="kv"><dt>Memiliki nilai E</dt><dd>{ya(m.ada_nilai_e)}</dd></div>
        </dl>
      </section>

      <section className="kartu">
        <div className="kartu-kepala"><h2>Riwayat magang</h2><span style={{ fontWeight: 700, color: 'var(--violet-24)' }}>{m.riwayat_magang.length} / {m.batas_magang}</span></div>
        {m.riwayat_magang.length === 0 ? <p className="kosong" style={{ marginTop: 8 }}>Belum ada riwayat magang.</p> : (
          <ul className="daftar-dok" style={{ marginTop: 12 }}>
            {m.riwayat_magang.map((r) => <li key={r.id}><span>{r.nama_perusahaan} · {r.tahun}</span><span className="badge abu">{r.sumber === 'sistem' ? 'Tercatat sistem' : 'Diisi mahasiswa'}</span></li>)}
          </ul>
        )}
        <p className="catatan-kecil">Batas dua kali magang mencakup magang mandiri. Pastikan riwayat sesuai data akademik.</p>
      </section>

      <section className="kartu">
        <h2>Lepas NPM</h2>
        <p className="isi">Dipakai bila NPM ini didaftarkan oleh akun yang salah. Data diri akun dihapus dan akunnya dinonaktifkan, supaya pemilik NPM bisa mendaftar ulang. Tidak bisa dilakukan jika akun sudah punya pengajuan atau riwayat magang.</p>
        {!yakinLepas ? <button type="button" className="btn garis" style={{ marginTop: 12 }} onClick={() => setYakinLepas(true)}>Lepas NPM…</button> : (
          <div className="baris-aksi" style={{ marginTop: 12 }}>
            <button type="button" className="btn garis" onClick={() => setYakinLepas(false)}>Batal</button>
            <button type="button" className="btn kuning" disabled={sibuk} onClick={() => jalan(async () => { await api(`/admin/mahasiswa/${id}/lepas-npm`, { method: 'POST' }); navigate('/admin/akun?tab=mahasiswa'); }, { judul: 'NPM dilepas', teks: 'Akun dinonaktifkan dan data diri dihapus. Pemilik NPM dapat mendaftar ulang.' })}>Ya, lepas NPM</button>
          </div>
        )}
      </section>

      <section className="kartu">
        <h2>Verifikasi</h2>
        <p className="isi">Cocokkan dengan data akademik resmi. Bila ada yang tidak sesuai, tulis catatan agar mahasiswa memperbaikinya.</p>
        <form className="aksi-form" onSubmit={(e) => e.preventDefault()}>
          <label>Catatan (wajib bila tidak sesuai)
            <textarea rows={3} maxLength={500} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: IPK di sistem akademik 3.21, bukan 3.45" />
          </label>
          <div className="baris-aksi" style={{ marginTop: 0 }}>
            <button className="btn garis" type="button" disabled={sibuk || catatan.trim().length < 5} style={{ color: 'var(--red-fg)', borderColor: 'var(--red-fg)' }} onClick={() => verifikasi('tidak_sesuai')}>Tandai Tidak Sesuai</button>
            <button className="btn isi" type="button" disabled={sibuk} onClick={() => verifikasi('terverifikasi')}>Data Sesuai, Verifikasi</button>
          </div>
        </form>
      </section>
    </div>
  );
}
