// PERAN: MAHASISWA (FR-16, UI-03/UI-05). Admin Prodi memverifikasi data ini dari halaman admin;
// kolom status_verifikasi dan catatan_verifikasi diisi mereka.
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import { supabase } from '../supabase';
import Badge from '../components/Badge.jsx';
import UbahPassword from '../components/UbahPassword.jsx';
import { beritahu } from '../components/Pemberitahuan.jsx';
import './profile.css';

const awal = { nama: '', npm: '', email: '', ipk: '', jumlah_sks: '', semester: '', no_telepon: '', alamat: '', status_aktif: true, status_cuti: false, ada_nilai_e: false };

function Pesan({ pesan }) {
  return pesan && <p className={`pesan ${pesan.galat ? 'galat' : 'ok'}`} role="status">{pesan.teks}</p>;
}

function DataDiri({ me, onSimpan, onSelesai }) {
  const baru = !me.terdaftar;
  const [form, setForm] = useState(baru ? { ...awal, nama: me.nama, email: me.email } : me);
  const [pesan, setPesan] = useState(null);
  // Data langkah 2 pendaftaran tersimpan di metadata akun: isikan otomatis agar mahasiswa tinggal memeriksa.
  useEffect(() => {
    if (!baru) return;
    supabase?.auth.getSession().then(({ data }) => {
      const m = data?.session?.user?.user_metadata ?? {};
      setForm((f) => ({ ...f, ...Object.fromEntries(['npm', 'semester', 'ipk', 'no_telepon', 'alamat'].filter((k) => m[k] && !f[k]).map((k) => [k, m[k]])) }));
    });
  }, [baru]);
  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function kirim(e) {
    e.preventDefault();
    try {
      await api('/mahasiswa/me', { method: 'PUT', body: form });
      await onSimpan();
      setPesan({ teks: 'Data diri tersimpan dan menunggu verifikasi Admin Prodi.' });
      onSelesai?.();
      beritahu({ judul: 'Data diri tersimpan', teks: baru ? 'Riwayat magang bersifat opsional. Silakan pilih menu di sebelah kiri.' : 'Menunggu verifikasi Admin Prodi.' });
    } catch (err) {
      setPesan({ teks: err.message, galat: true });
      beritahu({ jenis: 'galat', judul: 'Data diri gagal disimpan', teks: err.message });
    }
  }

  return (
    <form className="kartu masuk" style={{ '--urut': 1 }} onSubmit={kirim}>
      <div className="kartu-kepala">
        <h2>Data Diri</h2>
        {!baru && <Badge nilai={me.status_verifikasi} />}
      </div>
      {me.catatan_verifikasi && <p className="banner-peringatan" style={{ margin: '12px 0' }}>Catatan Admin Prodi: {me.catatan_verifikasi}</p>}

      <h3 className="seksi">Identitas</h3>
      <div className="grid-form tiga">
        <label>Nama lengkap
          <input required maxLength={60} readOnly={!baru} value={form.nama} onChange={ubah('nama')} />
        </label>
        <label>NPM
          <input required inputMode="numeric" pattern="\d{8}" title="8 digit angka" readOnly={!baru} value={form.npm} onChange={ubah('npm')} />
        </label>
        <label>Email
          <input type="email" readOnly value={form.email} />
        </label>
      </div>
      {baru && <p className="catatan-kecil">Nama dan NPM hanya bisa diisi sekali. Email mengikuti akun login Anda. Hubungi Admin Prodi bila ada kesalahan.</p>}

      <h3 className="seksi">Data akademik</h3>
      <div className="grid-form kolom-4">
        <label>IPK
          <input type="number" step="0.01" min="0" max="4" required value={form.ipk} onChange={ubah('ipk')} />
        </label>
        <label>Jumlah SKS
          <input type="number" step="1" min="0" required value={form.jumlah_sks} onChange={ubah('jumlah_sks')} />
        </label>
        <label>Semester
          <input type="number" step="1" min="1" required value={form.semester} onChange={ubah('semester')} />
        </label>
        <label>Nomor telepon
          <input type="tel" required pattern="08[0-9]{8,11}" title="10–13 digit, diawali 08" value={form.no_telepon} onChange={ubah('no_telepon')} />
        </label>
        <label>Alamat (tercetak di surat rekomendasi)
          <input required minLength={10} maxLength={200} placeholder="Jalan, nomor, kelurahan, kecamatan, kota" value={form.alamat ?? ''} onChange={ubah('alamat')} />
        </label>
      </div>

      <div className="centang">
        <label><input type="checkbox" checked={form.status_aktif} onChange={ubah('status_aktif')} /> Mahasiswa aktif</label>
        <label><input type="checkbox" checked={form.status_cuti} onChange={ubah('status_cuti')} /> Pernah cuti kuliah</label>
        <label><input type="checkbox" checked={form.ada_nilai_e} onChange={ubah('ada_nilai_e')} /> Memiliki nilai E</label>
      </div>

      <div className="baris-aksi">
        <button className="btn isi" type="submit">{baru ? 'Simpan dan Mulai' : 'Simpan Data Diri'}</button>
        {onSelesai && <button className="btn garis" type="button" onClick={onSelesai}>Batal</button>}
        <Pesan pesan={pesan} />
      </div>
    </form>
  );
}

function Riwayat({ me, onSimpan }) {
  const [form, setForm] = useState({ nama_perusahaan: '', tahun: new Date().getFullYear() });
  const [pesan, setPesan] = useState(null);
  const penuh = me.riwayat_magang.length >= me.batas_magang;

  async function tambah(e) {
    e.preventDefault();
    try {
      await api('/mahasiswa/riwayat', { method: 'POST', body: form });
      await onSimpan();
      setForm({ ...form, nama_perusahaan: '' });
      setPesan(null);
    } catch (err) {
      setPesan({ teks: err.message, galat: true });
    }
  }

  return (
    <section className="kartu masuk" style={{ '--urut': 2 }}>
      <div className="kartu-kepala">
        <h2>Riwayat Magang <span className="pil">Opsional</span></h2>
        <span className="hitung">{me.riwayat_magang.length} / {me.batas_magang}</span>
      </div>
      <p className="catatan-kecil">Tidak wajib. Isi hanya bila Anda pernah magang sebelum memakai SIGMA UG (termasuk magang mandiri); Admin Prodi memakainya untuk memeriksa batas {me.batas_magang} kali magang. Jika belum pernah, langsung saja pilih menu di sebelah kiri.</p>
      {me.riwayat_magang.length === 0 ? (
        <p className="kosong">Belum ada riwayat magang. Tidak apa-apa, bagian ini boleh dilewati.</p>
      ) : (
        <ul className="riwayat">
          {me.riwayat_magang.map((r) => (
            <li key={r.id}><span>{r.nama_perusahaan}</span><span>{r.tahun}</span></li>
          ))}
        </ul>
      )}
      {penuh ? (
        <p className="banner-peringatan" style={{ marginTop: 14 }}>Batas {me.batas_magang} kali magang sudah tercapai.</p>
      ) : (
        <form className="tambah" onSubmit={tambah}>
          <label>Perusahaan
            <input required maxLength={150} value={form.nama_perusahaan} onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })} />
          </label>
          <label>Tahun
            <input type="number" required min="2000" max="2100" value={form.tahun} onChange={(e) => setForm({ ...form, tahun: e.target.value })} />
          </label>
          <button className="btn garis" type="submit">Tambah</button>
        </form>
      )}
      <Pesan pesan={pesan} />
    </section>
  );
}

const inisial = (nama = '') => nama.split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0].toUpperCase()).join('') || 'MH';

// Tampilan profil seperti desain: kartu identitas, data mahasiswa, dan pengaturan akun. "Edit Profil" membuka formulir data diri.
function Ringkasan({ me, onEdit }) {
  const data = [
    ['Email', me.email], ['Nomor telepon', me.no_telepon], ['Fakultas', 'Ilmu Komputer dan Teknologi Informasi'], ['Program Studi', 'Sistem Informasi'],
    ['Semester', me.semester], ['IPK terakhir', Number(me.ipk).toFixed(2)], ['Jumlah SKS', me.jumlah_sks], ['Alamat', me.alamat ?? '–'],
  ];
  return (
    <>
      <section className="kartu profil-kepala masuk">
        <span className="avatar-besar" aria-hidden="true">{inisial(me.nama)}</span>
        <div className="profil-nama">
          <h2>{me.nama}</h2>
          <p className="stat-label">NPM {me.npm}</p>
          <div className="profil-lencana"><span className="badge ungu">Mahasiswa</span><span className={`badge ${me.status_aktif ? 'hijau' : 'abu'}`}>{me.status_aktif ? 'Akun Aktif' : 'Tidak Aktif'}</span><Badge nilai={me.status_verifikasi} /></div>
        </div>
        <button type="button" className="btn isi kecil" onClick={onEdit}>Edit Profil</button>
      </section>
      {me.catatan_verifikasi && <p className="banner-peringatan">Catatan Admin Prodi: {me.catatan_verifikasi}</p>}
      <section className="kartu masuk" style={{ '--urut': 1 }}>
        <h2>Data Mahasiswa</h2>
        <dl className="kv-grid" style={{ marginTop: 12 }}>
          {data.map(([k, v]) => <div key={k} className="kv"><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </section>
    </>
  );
}

function Akun({ email }) {
  const [buka, setBuka] = useState(false);
  return (
    <section className="kartu masuk">
      <h2>Pengaturan Akun</h2>
      <p className="isi profil-email">{email} <span className="badge hijau">Terverifikasi</span></p>
      <div className="baris-aksi" style={{ marginTop: 10, justifyContent: 'flex-start' }}>
        <button type="button" className="btn garis" onClick={() => setBuka(true)}>Ubah Password</button>
      </div>
      {buka && <UbahPassword onTutup={() => setBuka(false)} />}
    </section>
  );
}

export default function Profile() {
  const { me, muatMe } = useOutletContext();
  const [ubah, setUbah] = useState(false);
  const ringkas = me.terdaftar && !ubah;
  return (
    <div className="halaman profil">
      <div className="masuk">
        <h1 className="judul">{me.terdaftar ? (ubah ? 'Edit Profil' : 'Profil Saya') : 'Selamat datang di SIGMA UG'}</h1>
        <p className="sub">
          {me.terdaftar
            ? 'Data diri ini dipakai Admin Prodi untuk memeriksa persyaratan dan batas magang.'
            : 'Lengkapi data diri Anda terlebih dahulu. Data ini diverifikasi Admin Prodi karena sistem belum terhubung ke StudentSite.'}
        </p>
      </div>
      {ringkas ? <Ringkasan me={me} onEdit={() => setUbah(true)} /> : <DataDiri key={me.terdaftar} me={me} onSimpan={muatMe} onSelesai={ubah ? () => setUbah(false) : undefined} />}
      {me.terdaftar && <Riwayat me={me} onSimpan={muatMe} />}
      {me.terdaftar && <Akun email={me.email} />}
      {me.terdaftar && <button type="button" className="aksi-kecil" style={{ justifySelf: 'start' }} onClick={() => window.dispatchEvent(new Event('sigma-tur'))}>Lihat panduan penggunaan lagi</button>}
    </div>
  );
}
