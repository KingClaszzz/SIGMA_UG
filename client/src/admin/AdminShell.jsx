import Muat from '../components/Muat.jsx';
// KERANGKA PERAN ADMIN PRODI (FR-01): beberapa akun admin dengan hak setara. Akun dibuat tim pengembang (server/scripts/buat-akun.js).
// Menu mengikuti desain Figma admin. Mata Kuliah tidak ada di menu desain: dibuka dari halaman Pemetaan Mata Kuliah (/admin/mata-kuliah).
import { Navigate, Outlet } from 'react-router-dom';
import { useApi } from '../api';
import Kerangka from '../components/Kerangka.jsx';
import { useAkses } from '../auth/sesi';
import Notifikasi from './Notifikasi.jsx';
import './admin.css';

const menu = [
  ['/admin', 'Dashboard', 'nav-dashboard', true],
  ['/admin/periode', 'Informasi Periode', 'nav-dokumen'],
  ['/admin/rekomendasi', 'Pengajuan Surat Rekomendasi', 'nav-surat'],
  ['/admin/konversi', 'Penerimaan Konversi SKS', 'nav-konversi'],
  ['/admin/penugasan', 'Penugasan Dosen', 'nav-profil'],
  ['/admin/monitoring', 'Monitoring Magang', 'nav-dokumen'],
  ['/admin/akun', 'Manajemen Akun', 'nav-profil'],
];

export default function AdminShell() {
  const akses = useAkses('admin');
  if (akses.status === 'memuat') return <Muat penuh />;
  if (akses.status === 'galat') return <p className="sub" role="alert" style={{ padding: 32 }}>{akses.galat.message}</p>;
  if (akses.status === 'tolak') return <Navigate to={akses.ke} replace state={akses.state} />;
  return <Isi />;
}

export const inisial = (nama = '') => nama.split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0].toUpperCase()).join('') || 'AD';

function Isi() {
  const { data: saya } = useApi('/saya');
  const { data: periode } = useApi('/publik/periode');
  return (
    <Kerangka
      menu={menu}
      beranda="/admin"
      profil="/admin/profil"
      chip={periode?.tersedia ? periode.tahun_akademik : 'Periode belum diumumkan'}
      nama={saya?.nama ?? ' '}
      sub="Admin"
      avatar={inisial(saya?.nama)}
      maskot="papan"
      lonceng={<Notifikasi />}
    >
      <Outlet />
    </Kerangka>
  );
}
