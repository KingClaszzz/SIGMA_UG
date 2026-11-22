// PERAN: MAHASISWA — panduan singkat untuk akun baru. Muncul sekali setelah data diri pertama tersimpan (per akun, disimpan di browser),
// menyorot menu di kiri satu per satu. Bisa diulang dari halaman Profil lewat peristiwa 'sigma-tur'.
import { useEffect, useState } from 'react';
import './tour.css';

const LANGKAH = [
  { judul: 'Selamat datang di SIGMA UG', teks: 'Dalam beberapa langkah singkat, kenali menu utama untuk mengurus magang dan konversi SKS. Anda bisa melewatinya kapan saja.' },
  { to: '/dashboard', judul: 'Dashboard', teks: 'Ringkasan magang Anda: sisa batas magang, dosen pendamping, SKS konversi, dan status semua pengajuan surat rekomendasi.' },
  { to: '/surat-rekomendasi', judul: 'Surat Rekomendasi', teks: 'Mulai dari sini. Isi data perusahaan tujuan, unggah dokumen persyaratan (PDF, maks. 2 MB), lalu ajukan. Setelah disetujui Admin Prodi, surat PDF terbit otomatis dan bisa diunduh.' },
  { to: '/konversi-sks', judul: 'Konversi SKS', teks: 'Dibuka setelah surat rekomendasi terbit dan periode konversi berjalan. Unduh Form Isian Magang, isi sendiri, lalu unggah bersama surat penerimaan dari perusahaan.' },
  { to: '/dokumen-magang', judul: 'Dokumen Magang', teks: 'Setelah magang: unggah laporan akhir, nilai akhir mitra, sertifikat, dan logbook. Dosen pendamping memeriksanya; bila ada catatan, perbaiki lalu unggah ulang.' },
  { to: '/profil', judul: 'Profil dan Notifikasi', teks: 'Data diri Anda diverifikasi Admin Prodi. Riwayat magang bersifat opsional. Pantau juga batas waktu periode di bagian atas layar.' },
];
const kunci = (email) => `sigma-tur-mhs:${email}`;

export default function Tour({ email }) {
  const [i, setI] = useState(null); // null = tertutup
  useEffect(() => {
    let sudah = true;
    try { sudah = !!localStorage.getItem(kunci(email)); } catch { /* peramban memblokir penyimpanan: tur tidak ditampilkan otomatis */ }
    if (!sudah) setI(0);
    const ulang = () => setI(0);
    window.addEventListener('sigma-tur', ulang);
    return () => window.removeEventListener('sigma-tur', ulang);
  }, [email]);

  const langkah = i === null ? null : LANGKAH[i];
  useEffect(() => {
    if (!langkah?.to) return undefined;
    const el = document.querySelector(`.aside a[href="${langkah.to}"]`);
    el?.classList.add('tur-sorot');
    return () => el?.classList.remove('tur-sorot');
  }, [langkah]);

  function tutup() {
    try { localStorage.setItem(kunci(email), '1'); } catch { /* abaikan */ }
    setI(null);
  }
  if (!langkah) return null;
  const akhir = i === LANGKAH.length - 1;
  return (
    <div className="tur" role="dialog" aria-label="Panduan penggunaan">
      <p className="tur-hitung">Panduan {i + 1} dari {LANGKAH.length}</p>
      <h2>{langkah.judul}</h2>
      <p>{langkah.teks}</p>
      <div className="tur-titik" aria-hidden="true">{LANGKAH.map((_, n) => <span key={n} className={n === i ? 'aktif' : ''} />)}</div>
      <div className="tur-aksi">
        <button type="button" className="aksi-kecil" onClick={tutup}>{akhir ? 'Tutup' : 'Lewati'}</button>
        <span>
          {i > 0 && <button type="button" className="btn garis kecil" onClick={() => setI(i - 1)}>Kembali</button>}
          <button type="button" className="btn isi kecil" onClick={() => (akhir ? tutup() : setI(i + 1))}>{akhir ? 'Selesai' : 'Berikutnya'}</button>
        </span>
      </div>
    </div>
  );
}
