import Muat from '../components/Muat.jsx';
// PERAN: ADMIN PRODI — manajemen akun (FR-16). Tab Dosen: buat akun Dosen Pendamping, aktifkan/nonaktifkan.
// Tab Mahasiswa: status verifikasi data diri (membuka admin/DataMahasiswa.jsx) dan aktifkan/nonaktifkan akun.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, useAksi, useApi } from '../api';
import Badge from '../components/Badge.jsx';
import Dialog from '../components/Dialog.jsx';
import InputSandi from '../components/InputSandi.jsx';

const TAB = [['dosen', 'Dosen'], ['mahasiswa', 'Mahasiswa']];
const KOSONG = { nama: '', nidn: '', email: '', no_telepon: '', password: '' };
const StatusAkun = ({ aktif }) => <span className={`badge ${aktif ? 'hijau' : 'abu'}`}>{aktif ? 'Aktif' : 'Nonaktif'}</span>;

// Dialog konfirmasi aktif/nonaktif yang sama untuk kedua tab.
function UbahAktif({ akun, onTutup, muat }) {
  const { sibuk, galat, jalan } = useAksi(muat);
  const matikan = akun.is_aktif;
  return (
    <Dialog judul={matikan ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?'} onTutup={onTutup}>
      <p className="isi">{matikan ? `${akun.nama} tidak akan bisa masuk ke SIGMA UG sampai akunnya diaktifkan kembali.` : `${akun.nama} bisa masuk kembali ke SIGMA UG.`}</p>
      {galat && <p className="pesan galat" role="alert">{galat}</p>}
      <div className="dialog-aksi">
        <button className="btn garis" onClick={onTutup}>Batal</button>
        <button className={`btn ${matikan ? 'garis bahaya' : 'isi'}`} disabled={sibuk} onClick={async () => { if (await jalan(() => api(`/admin/akun/${akun.id_user}/aktif`, { method: 'PUT', body: { aktif: !matikan } }), { judul: matikan ? 'Akun dinonaktifkan' : 'Akun diaktifkan' })) onTutup(); }}>{matikan ? 'Nonaktifkan' : 'Aktifkan'}</button>
      </div>
    </Dialog>
  );
}

// Hapus permanen. Mahasiswa dihapus beserta seluruh datanya; dosen yang sudah punya riwayat ditolak server dan diarahkan ke Nonaktifkan.
function HapusAkun({ akun, jenis, onTutup, muat }) {
  const { sibuk, galat, jalan } = useAksi(muat);
  const mahasiswa = jenis === 'mahasiswa';
  return (
    <Dialog judul="Hapus Akun Permanen?" onTutup={onTutup}>
      <p className="isi"><strong>{akun.nama}</strong>{mahasiswa ? ` (${akun.npm})` : ''} dan akun loginnya akan dihapus <strong>permanen</strong>.</p>
      {mahasiswa
        ? <p className="isi">Semua data mahasiswa ini ikut terhapus: data diri, pengajuan surat rekomendasi dan konversi, dokumen, surat yang sudah terbit, dan riwayatnya.</p>
        : <p className="isi">Dosen yang sudah punya mahasiswa bimbingan atau riwayat pemeriksaan tidak bisa dihapus; untuk itu gunakan Nonaktifkan.</p>}
      <p className="banner-peringatan" style={{ margin: '12px 0 0' }}>Tindakan ini tidak dapat dibatalkan. Untuk sekadar menutup akses, pilih Nonaktifkan.</p>
      {galat && <p className="pesan galat" role="alert">{galat}</p>}
      <div className="dialog-aksi">
        <button className="btn garis" onClick={onTutup}>Batal</button>
        <button className="btn garis bahaya" disabled={sibuk} onClick={async () => {
          const h = await jalan(() => api(`/admin/akun/${akun.id_user}`, { method: 'DELETE' }),
            (r) => (r.auth_dihapus ? { judul: 'Akun dihapus', teks: `${akun.nama} dan datanya sudah dihapus.` } : { jenis: 'info', judul: 'Data dihapus, akun login belum', teks: 'Hapus akun login di Supabase → Authentication → Users secara manual.' }));
          if (h) onTutup();
        }}>{sibuk ? 'Menghapus…' : 'Ya, Hapus Permanen'}</button>
      </div>
    </Dialog>
  );
}

function TambahDosen({ onTutup, muat }) {
  const [f, setF] = useState(KOSONG);
  const { sibuk, galat, jalan } = useAksi(muat);
  const isi = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Dialog judul="Tambah Akun Dosen" onTutup={onTutup} lebar={520}>
      <form className="aksi-form" style={{ marginTop: 0 }} onSubmit={async (e) => { e.preventDefault(); if (await jalan(() => api('/admin/akun/dosen', { method: 'POST', body: f }), (h) => (h.email_terkirim ? { judul: 'Akun dosen dibuat', teks: 'Tautan verifikasi dikirim ke email dosen. Sampaikan juga kata sandi awal.' } : { jenis: 'galat', judul: 'Akun dibuat, email verifikasi gagal dikirim', teks: 'Periksa pengaturan SMTP di Supabase, lalu klik Kirim Ulang Verifikasi pada akun ini.' }))) onTutup(); }}>
        <div className="grid-form">
          <label className="penuh">Nama Lengkap *<input required maxLength={60} value={f.nama} onChange={isi('nama')} /></label>
          <label>NIDN *<input required pattern="[0-9A-Za-z]{5,20}" title="5–20 huruf atau angka" value={f.nidn} onChange={isi('nidn')} /></label>
          <label>No. Telepon *<input required pattern="08\d{8,11}" title="10–13 digit, diawali 08" placeholder="08xxxxxxxxxx" value={f.no_telepon} onChange={isi('no_telepon')} /></label>
          <label className="penuh">Email *<input required type="email" maxLength={100} value={f.email} onChange={isi('email')} /></label>
          <label className="penuh">Kata Sandi Awal *<InputSandi required minLength={8} maxLength={72} autoComplete="new-password" value={f.password} onChange={isi('password')} /></label>
        </div>
        <p className="catatan-kecil" style={{ marginTop: 0 }}>Tautan verifikasi dikirim ke email di atas; dosen baru bisa masuk setelah mengkliknya. Sampaikan kata sandi awal ini kepada dosen, yang bisa menggantinya lewat “Lupa kata sandi”.</p>
        {galat && <p className="pesan galat" role="alert">{galat}</p>}
        <div className="dialog-aksi">
          <button className="btn garis" type="button" onClick={onTutup}>Batal</button>
          <button className="btn isi" type="submit" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan Akun'}</button>
        </div>
      </form>
    </Dialog>
  );
}

function KirimUlangVerifikasi({ d, muat }) {
  const { sibuk, galat, jalan } = useAksi(muat);
  return (
    <>
      <button className="btn garis kecil" disabled={sibuk} onClick={() => jalan(() => api(`/admin/akun/dosen/${d.id_user}/verifikasi-ulang`, { method: 'POST' }), { judul: 'Email verifikasi dikirim', teks: `Tautan dikirim ke ${d.email}.` })}>{sibuk ? 'Mengirim…' : 'Kirim Ulang Verifikasi'}</button>
      {galat && <p className="pesan galat" role="alert" style={{ marginTop: 6 }}>{galat}</p>}
    </>
  );
}

function TabDosen() {
  const [cari, setCari] = useState('');
  const [status, setStatus] = useState('semua');
  const { data, error, muat } = useApi(`/admin/akun/dosen?q=${encodeURIComponent(cari)}&status=${status}`);
  const [tambah, setTambah] = useState(false);
  const [ubah, setUbah] = useState(null);
  const [hapus, setHapus] = useState(null);
  return (
    <>
      <div className="alat-tabel">
        <input type="search" placeholder="Cari nama, NIDN, atau email…" aria-label="Cari dosen" value={cari} onChange={(e) => setCari(e.target.value)} />
        <select aria-label="Status akun" value={status} onChange={(e) => setStatus(e.target.value)}><option value="semua">Semua Status</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select>
        <button className="btn kuning kecil" onClick={() => setTambah(true)}>+ Tambah Akun Dosen</button>
      </div>
      {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.length === 0 ? <p className="kosong">Belum ada akun dosen yang cocok.</p> : (
        <div className="tabel-wrap">
          <table>
            <thead><tr><th>Nama Dosen</th><th>NIDN</th><th>Email</th><th>Mahasiswa Bimbingan</th><th>Status</th><th><span className="sr">Aksi</span></th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id}>
                  <td>{d.nama}</td><td>{d.nidn}</td><td>{d.email}</td>
                  <td>{d.bimbingan.length === 0 ? '–' : d.bimbingan.join(', ')}</td>
                  <td>
                    <div className="status-akun">
                      <StatusAkun aktif={d.is_aktif} />
                      <span className={`badge ${d.email_terverifikasi === null ? 'merah' : d.email_terverifikasi ? 'hijau' : 'kuning'}`}>{d.email_terverifikasi === null ? 'Akun login tidak ditemukan' : d.email_terverifikasi ? 'Email terverifikasi' : 'Email belum diverifikasi'}</span>
                    </div>
                  </td>
                  <td><div className="aksi-akun"><button className={`btn garis kecil${d.is_aktif ? ' bahaya' : ''}`} onClick={() => setUbah(d)}>{d.is_aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>{d.email_terverifikasi === false && <KirimUlangVerifikasi d={d} muat={muat} />}<button className="btn garis kecil bahaya" onClick={() => setHapus(d)}>Hapus</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tambah && <TambahDosen onTutup={() => setTambah(false)} muat={muat} />}
      {ubah && <UbahAktif akun={ubah} onTutup={() => setUbah(null)} muat={muat} />}
      {hapus && <HapusAkun akun={hapus} jenis="dosen" onTutup={() => setHapus(null)} muat={muat} />}
    </>
  );
}

function TabMahasiswa() {
  const [cari, setCari] = useState('');
  const [status, setStatus] = useState('semua');
  const { data, error, muat } = useApi(`/admin/mahasiswa?q=${encodeURIComponent(cari)}${status === 'semua' ? '' : `&status=${status}`}`);
  const [ubah, setUbah] = useState(null);
  const [hapus, setHapus] = useState(null);
  return (
    <>
      <div className="alat-tabel">
        <input type="search" placeholder="Cari nama, NPM, atau email…" aria-label="Cari mahasiswa" value={cari} onChange={(e) => setCari(e.target.value)} />
        <select aria-label="Status verifikasi" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="semua">Semua Status</option><option value="menunggu">Menunggu Verifikasi</option><option value="terverifikasi">Terverifikasi</option><option value="tidak_sesuai">Tidak Sesuai</option>
        </select>
      </div>
      {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.length === 0 ? <p className="kosong">Tidak ada mahasiswa yang cocok.</p> : (
        <div className="tabel-wrap">
          <table>
            <thead><tr><th>Nama Mahasiswa</th><th>NPM</th><th>Email</th><th>Verifikasi Data Diri</th><th>Status Akun</th><th><span className="sr">Aksi</span></th></tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id}>
                  <td>{m.nama}</td><td>{m.npm}</td><td>{m.email}</td>
                  <td><Badge nilai={m.status_verifikasi} /></td>
                  <td><StatusAkun aktif={m.is_aktif} /></td>
                  <td>
                    <div className="aksi-akun">
                    <Link className="btn garis kecil" to={`/admin/mahasiswa/${m.id}`}>{m.status_verifikasi === 'menunggu' ? 'Verifikasi' : 'Detail'}</Link>
                    <button className={`btn garis kecil${m.is_aktif ? ' bahaya' : ''}`} onClick={() => setUbah(m)}>{m.is_aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    <button className="btn garis kecil bahaya" onClick={() => setHapus(m)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ubah && <UbahAktif akun={ubah} onTutup={() => setUbah(null)} muat={muat} />}
      {hapus && <HapusAkun akun={hapus} jenis="mahasiswa" onTutup={() => setHapus(null)} muat={muat} />}
    </>
  );
}

export default function Akun() {
  const [params, setParams] = useSearchParams();
  const tab = TAB.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'dosen';
  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">Manajemen Akun</h1>
        <p className="sub">Kelola akun Dosen Pendamping dan pantau verifikasi data diri mahasiswa.</p>
      </header>
      <section className="kartu">
        <div className="tab-garis" role="tablist">
          {TAB.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'aktif' : ''} onClick={() => setParams({ tab: k })}>{label}</button>)}
        </div>
        {tab === 'dosen' ? <TabDosen /> : <TabMahasiswa />}
      </section>
    </div>
  );
}
