// KERANGKA PERAN MAHASISWA: menu dan identitas mahasiswa di atas components/Kerangka.jsx.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApi } from '../api';
import Kerangka from '../components/Kerangka.jsx';
import { useAkses } from '../auth/sesi';
import Notifikasi from '../admin/Notifikasi.jsx';
import Tour from './Tour.jsx';

const menu = [
  ['/dashboard', 'Dashboard', 'nav-dashboard'],
  ['/surat-rekomendasi', 'Surat Rekomendasi', 'nav-surat'],
  ['/konversi-sks', 'Konversi SKS', 'nav-konversi'],
  ['/dokumen-magang', 'Dokumen Magang', 'nav-dokumen'],
];

// Pengaman: hanya mahasiswa yang sudah masuk boleh melihat halaman ini. Server tetap memverifikasi setiap permintaan.
export default function MahasiswaShell() {
  const akses = useAkses('mahasiswa');
  if (akses.status === 'memuat') return <p className="sub" style={{ padding: 32 }}>Memuat…</p>;
  if (akses.status === 'galat') return <p className="sub" role="alert" style={{ padding: 32 }}>{akses.galat.message}</p>;
  if (akses.status === 'tolak') return <Navigate to={akses.ke} replace state={akses.state} />;
  return <Isi />;
}

function Isi() {
  const { data: me, muat } = useApi('/mahasiswa/me');
  const { data: periode } = useApi('/publik/periode');
  const { pathname } = useLocation();

  // Semua fitur butuh data diri (FR-16): mahasiswa baru diarahkan mengisinya dulu.
  if (me && !me.terdaftar && pathname !== '/profil') return <Navigate to="/profil" replace />;

  return (
    <Kerangka
      menu={menu}
      beranda="/dashboard"
      profil="/profil"
      maskot="laptop"
      lonceng={me?.terdaftar ? <Notifikasi dasar="/mahasiswa" /> : null}
      chip={periode?.tersedia ? periode.tahun_akademik : 'Periode belum diumumkan'}
      nama={me?.terdaftar ? me.nama : 'Lengkapi data diri'}
      sub={me?.terdaftar ? `${me.npm} · Sistem Informasi` : null}
    >
      {me ? <Outlet context={{ me, muatMe: muat, periode }} /> : <p className="sub">Memuat…</p>}
      {me?.terdaftar && <Tour email={me.email} />}
    </Kerangka>
  );
}
