// KERANGKA PERAN DOSEN PENDAMPING: menu dan identitas dosen di atas components/Kerangka.jsx. Akun dibuat Admin Prodi (Manajemen Akun).
// Memakai gaya admin/admin.css (tabel, kartu statistik, dialog) agar tampilannya seragam dengan admin.
import { Navigate, Outlet } from 'react-router-dom';
import { useApi } from '../api';
import Kerangka from '../components/Kerangka.jsx';
import { useAkses } from '../auth/sesi';
import Notifikasi from '../admin/Notifikasi.jsx';
import '../admin/admin.css';

const menu = [
  ['/dosen', 'Dashboard', 'nav-dashboard', true],
  ['/dosen/bimbingan', 'Mahasiswa Bimbingan', 'nav-profil'],
  ['/dosen/monitoring', 'Monitoring Magang', 'nav-dokumen'],
];

export default function DosenShell() {
  const akses = useAkses('dosen');
  if (akses.status === 'memuat') return <p className="sub" style={{ padding: 32 }}>Memuat…</p>;
  if (akses.status === 'galat') return <p className="sub" role="alert" style={{ padding: 32 }}>{akses.galat.message}</p>;
  if (akses.status === 'tolak') return <Navigate to={akses.ke} replace state={akses.state} />;
  return <Isi />;
}

export const inisial = (nama = '') => nama.split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0].toUpperCase()).join('') || 'DS';

function Isi() {
  const { data: saya } = useApi('/saya');
  const { data: periode } = useApi('/publik/periode');
  return (
    <Kerangka
      menu={menu}
      beranda="/dosen"
      profil="/dosen/profil"
      chip={periode?.tersedia ? periode.tahun_akademik : 'Periode belum diumumkan'}
      nama={saya?.nama ?? ' '}
      sub="Dosen Pendamping"
      avatar={inisial(saya?.nama)}
      maskot="jas"
      lonceng={<Notifikasi dasar="/dosen" />}
    >
      <Outlet />
    </Kerangka>
  );
}
