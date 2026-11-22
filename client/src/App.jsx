import { Navigate, Route, Routes } from 'react-router-dom';
import Pemberitahuan from './components/Pemberitahuan.jsx';
import Landing from './pages/Landing.jsx';
import { ArahPeran, AturUlangPassword, Daftar, LupaPassword, Masuk } from './auth/Auth.jsx';
import MahasiswaShell from './mahasiswa/MahasiswaShell.jsx';
import Dashboard from './mahasiswa/Dashboard.jsx';
import Profile from './mahasiswa/Profile.jsx';
import { AjukanRekomendasi, DetailRekomendasi, RiwayatRekomendasi } from './mahasiswa/SuratRekomendasi.jsx';
import KonversiSks, { AjukanKonversi, DetailKonversi, RiwayatKonversi } from './mahasiswa/KonversiSks.jsx';
import DokumenMagang from './mahasiswa/DokumenMagang.jsx';
import AdminShell from './admin/AdminShell.jsx';
import DashboardAdmin from './admin/Dashboard.jsx';
import { DaftarRekomendasi, DetailRekomendasiAdmin } from './admin/Rekomendasi.jsx';
import { DaftarKonversi, DetailKonversiAdmin, PemetaanKonversi } from './admin/Konversi.jsx';
import { DaftarPenugasan, DetailPenugasan } from './admin/Penugasan.jsx';
import { DetailMahasiswa } from './admin/DataMahasiswa.jsx';
import { DaftarPeriode, DetailPeriode, FormPeriode } from './admin/Periode.jsx';
import { DaftarMonitoring, DetailMonitoring } from './admin/Monitoring.jsx';
import Akun from './admin/Akun.jsx';
import MataKuliah from './admin/MataKuliah.jsx';
import DosenShell from './dosen/DosenShell.jsx';
import { DashboardDosen, DaftarBimbingan, DetailBimbingan } from './dosen/Bimbingan.jsx';
import { DaftarMonitoring as MonitoringDosen, DetailDokumen, RiwayatMonitoring } from './dosen/Monitoring.jsx';
import ProfilDosen from './dosen/Profil.jsx';

export default function App() {
  return (
    <>
    <Pemberitahuan />
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/masuk" element={<Masuk />} />
      <Route path="/daftar" element={<Daftar />} />
      <Route path="/lupa-password" element={<LupaPassword />} />
      <Route path="/atur-ulang-password" element={<AturUlangPassword />} />
      <Route path="/arah" element={<ArahPeran />} />
      <Route element={<MahasiswaShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/surat-rekomendasi" element={<AjukanRekomendasi />} />
        <Route path="/surat-rekomendasi/riwayat" element={<RiwayatRekomendasi />} />
        <Route path="/surat-rekomendasi/riwayat/:id" element={<DetailRekomendasi />} />
        <Route path="/konversi-sks" element={<KonversiSks />} />
        <Route path="/konversi-sks/ajukan" element={<AjukanKonversi />} />
        <Route path="/konversi-sks/ajukan/:id" element={<AjukanKonversi />} />
        <Route path="/konversi-sks/riwayat" element={<RiwayatKonversi />} />
        <Route path="/konversi-sks/riwayat/:id" element={<DetailKonversi />} />
        <Route path="/dokumen-magang/:tab?" element={<DokumenMagang />} />
      </Route>
      <Route element={<AdminShell />}>
        <Route path="/admin" element={<DashboardAdmin />} />
        <Route path="/admin/rekomendasi" element={<DaftarRekomendasi />} />
        <Route path="/admin/rekomendasi/:id" element={<DetailRekomendasiAdmin />} />
        <Route path="/admin/konversi" element={<DaftarKonversi />} />
        <Route path="/admin/konversi/:id" element={<DetailKonversiAdmin />} />
        <Route path="/admin/konversi/:id/pemetaan" element={<PemetaanKonversi />} />
        <Route path="/admin/penugasan" element={<DaftarPenugasan />} />
        <Route path="/admin/penugasan/:id" element={<DetailPenugasan />} />
        <Route path="/admin/akun" element={<Akun />} />
        <Route path="/admin/monitoring" element={<DaftarMonitoring />} />
        <Route path="/admin/monitoring/:id" element={<DetailMonitoring />} />
        <Route path="/admin/mahasiswa/:id" element={<DetailMahasiswa />} />
        <Route path="/admin/periode" element={<DaftarPeriode />} />
        <Route path="/admin/periode/baru" element={<FormPeriode />} />
        <Route path="/admin/periode/:id" element={<DetailPeriode />} />
        <Route path="/admin/periode/:id/ubah" element={<FormPeriode />} />
        <Route path="/admin/mata-kuliah" element={<MataKuliah />} />
      </Route>
      <Route element={<DosenShell />}>
        <Route path="/dosen" element={<DashboardDosen />} />
        <Route path="/dosen/bimbingan" element={<DaftarBimbingan />} />
        <Route path="/dosen/bimbingan/:id" element={<DetailBimbingan />} />
        <Route path="/dosen/monitoring" element={<MonitoringDosen />} />
        <Route path="/dosen/monitoring/:id/:jenis" element={<DetailDokumen />} />
        <Route path="/dosen/riwayat" element={<RiwayatMonitoring />} />
        <Route path="/dosen/profil" element={<ProfilDosen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
