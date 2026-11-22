// Label dan warna status. Kunci mengikuti nilai di server (SDD) supaya satu komponen dipakai semua peran.
const status = {
  // pengajuan_rekomendasi dan pengajuan_konversi
  draft: ['Draft', 'abu'],
  diajukan: ['Menunggu validasi', 'kuning'],
  ditinjau: ['Ditinjau', 'kuning'],
  diproses: ['Diproses', 'kuning'],
  disetujui: ['Disetujui', 'hijau'],
  ditolak: ['Ditolak', 'merah'],
  diterbitkan: ['Diterbitkan', 'hijau'],
  selesai: ['Selesai', 'hijau'],
  // mahasiswa.status_verifikasi
  menunggu: ['Menunggu pemeriksaan', 'kuning'],
  terverifikasi: ['Terverifikasi', 'hijau'],
  tidak_sesuai: ['Tidak sesuai', 'merah'],
  // dokumen_akhir
  belum_diunggah: ['Belum diunggah', 'abu'],
  perlu_perbaikan: ['Perlu perbaikan', 'merah'],
  // periode_magang.status
  dipublikasikan: ['Dipublikasikan', 'hijau'],
  menunggu_ulang: ['Menunggu pemeriksaan ulang', 'ungu'],
  berjalan: ['Berjalan', 'ungu'],
  // jendela periode
  dibuka: ['Sedang dibuka', 'hijau'],
  akan_dibuka: ['Akan dibuka', 'kuning'],
  ditutup: ['Ditutup', 'merah'],
};

export default function Badge({ nilai, label }) {
  const [teks, warna] = status[nilai] ?? [nilai, 'abu'];
  return <span className={`badge ${warna}`}>{label ?? teks}</span>;
}
