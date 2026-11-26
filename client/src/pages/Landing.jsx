// HALAMAN PUBLIK (tanpa login). Dasar visual dari Figma "Landing Page", disesuaikan untuk web:
// ukuran fluid, header menempel, hero beranimasi, dan beberapa seksi tambahan.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { icon, logo } from '../assets';
import Maskot from '../components/Maskot.jsx';
import { Partikel } from './MaskotHero.jsx';
import { useApi } from '../api';
import { labelBulan, rentang, sisaHari } from '../format';
import './landing.css';

const kartuPeriode = {
  pengajuan: {
    judul: 'Periode Pengajuan Surat Permohonan Magang',
    isi: 'Mahasiswa dapat mengajukan surat permohonan magang kepada Program Studi sesuai dengan ketentuan yang berlaku.',
    warna: 'ungu',
  },
  konversi: {
    judul: 'Periode Pengajuan Konversi Mata Kuliah Magang',
    isi: 'Mahasiswa yang telah diterima magang dapat mengajukan konversi SKS.',
    warna: 'kuning',
  },
};

const statusPeriode = {
  dibuka: ['Sedang dibuka', 'dibuka', 'dot-green'],
  akan_dibuka: ['Akan dibuka', 'akan', 'dot-grey'],
  ditutup: ['Ditutup', 'akan', 'dot-grey'],
};

const langkah = [
  ['step-doc', 'Ajukan Surat Rekomendasi', 'Isi formulir online dan pilih perusahaan tujuan.'],
  ['step-verified', 'Validasi Kelayakan', 'Persyaratan akademik diperiksa oleh pengelola.'],
  ['step-send-1', 'Surat Terbit Otomatis', 'Unduh surat rekomendasi langsung dari akunmu.'],
  ['step-send-2', 'Surat Perusahaan', 'Kirim surat penerimaan dan silabus perusahaan.'],
  ['step-reg', 'Konversi SKS', 'Pantau hasil konversi dan unduh surat final.'],
];

// Syarat mengikuti BR-02 dan BR-03 pada SRS.
const syarat = (tahunAkademik) => [
  'Mahasiswa aktif semester 5 atau lebih',
  tahunAkademik ? `Aktif di semester ${tahunAkademik}` : 'Aktif pada semester berjalan',
  'Tidak memiliki nilai E',
  'IPK minimal 3.00',
  'Tidak pernah cuti kuliah',
  'Maksimal telah mengikuti magang 2 kali',
];

const tanya = [
  ['Siapa yang boleh mengajukan surat rekomendasi?', 'Mahasiswa Sistem Informasi yang aktif di semester berjalan, minimal semester 5, IPK minimal 3.00, tidak memiliki nilai E, dan tidak pernah cuti. Admin Prodi memeriksa kelengkapannya.'],
  ['Berapa kali saya boleh magang?', 'Maksimal dua kali, termasuk magang mandiri. Pengajuan ketiga akan ditolak saat validasi.'],
  ['Bagaimana mendapatkan surat rekomendasi?', 'Ajukan lewat SIGMA UG selama periode dibuka. Setelah Admin Prodi menyetujui, surat PDF terbit otomatis dan bisa Anda unduh dari akun.'],
  ['Apa itu konversi SKS?', 'Pengakuan kegiatan magang sebagai mata kuliah. Setelah diterima perusahaan, unggah surat penerimaan dan silabus, lalu Admin Prodi menentukan mata kuliah dan SKS yang diakui.'],
  ['Surat konversi perlu ditandatangani?', 'Ya. Surat konversi diunduh dalam bentuk PDF, dicetak, lalu ditandatangani basah di luar sistem.'],
];

// shortcut: daftar umum dari desain Figma, dipakai bila API periode belum terhubung/gagal. Data asli dari tabel kategori_perusahaan.
const MITRA_UMUM = ['Kementerian / Instansi Pemerintah', 'BUMN', 'Program MAGENTA', 'Perusahaan Terbuka (Tbk.)'];

const kontak = { alamat: 'Kampus Depok, Universitas Gunadarma', telepon: '0821-2745-3186', email: 'esurket@gunadarma.ac.id' };

function Merek({ kecil }) {
  return (
    <Link to="/" className={`merek${kecil ? ' kecil' : ''}`}>
      <img src={logo} alt="" width="48" height="48" />
      <span>
        <span className="merek-nama">SIGMA</span>
        <span className="merek-sub">Universitas Gunadarma</span>
      </span>
    </Link>
  );
}

function KartuPeriode({ j }) {
  const k = kartuPeriode[j.jenis];
  const [label, kelas, dot] = statusPeriode[j.status];
  const sisa = j.status === 'dibuka' ? sisaHari(j.tutup) : null;
  return (
    <article className={`kartu-periode reveal ${k.warna}`}>
      <div className="kartu-atas">
        <span className="pil-bulan">{labelBulan(j.buka, j.tutup)}</span>
        {sisa !== null && <span className="sisa">{sisa} hari lagi</span>}
      </div>
      <h3>{k.judul}</h3>
      <p>{k.isi}</p>
      <div className="kartu-kaki">
        <img src={icon('calendar')} alt="" width="22" height="22" />
        <span>{rentang(j.buka, j.tutup)}</span>
        <span className={`status ${kelas}`}>
          <img src={icon(dot)} alt="" width="22" height="22" />
          {label}
        </span>
      </div>
    </article>
  );
}

// Ilustrasi hero: maskot beranimasi dikelilingi cincin partikel interaktif (tanpa teks atau data apa pun).
function VisualHero() {
  return (
    <div className="visual">
      <Partikel />
      <span className="orb-kecil" aria-hidden="true" />
      <span className="cincin" aria-hidden="true" />
      <span className="kilau k1" aria-hidden="true">✦</span>
      <span className="kilau k2" aria-hidden="true">✦</span>
      <span className="kilau k3" aria-hidden="true">✦</span>
      <Maskot pose="jas" className="maskot-hero" />
    </div>
  );
}

export default function Landing() {
  const { data: periode, error: galatPeriode } = useApi('/publik/periode');
  const [menempel, setMenempel] = useState(false);

  useEffect(() => {
    const gulir = () => setMenempel(window.scrollY > 8);
    gulir();
    window.addEventListener('scroll', gulir, { passive: true });
    return () => window.removeEventListener('scroll', gulir);
  }, []);

  // Elemen .reveal muncul halus saat masuk layar; tanpa IntersectionObserver langsung tampil.
  useEffect(() => {
    const el = document.querySelectorAll('.lp .reveal:not(.tampil)');
    if (!('IntersectionObserver' in window)) return el.forEach((e) => e.classList.add('tampil'));
    const io = new IntersectionObserver((hasil) => hasil.forEach((h) => {
      if (h.isIntersecting) { h.target.classList.add('tampil'); io.unobserve(h.target); }
    }), { threshold: 0.15 });
    el.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [periode]);

  return (
    <div className="lp">
      <header className={`lp-header${menempel ? ' menempel' : ''}`}>
        <div className="wrap lp-header-isi">
          <Merek />
          <nav aria-label="Navigasi utama">
            <a href="#periode">Periode Magang</a>
            <a href="#tahapan">Tahapan</a>
            <a href="#syarat">Syarat</a>
            <a href="#tanya">Tanya Jawab</a>
          </nav>
          <Link to="/masuk" className="btn-masuk">Masuk</Link>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-isi">
          <div className="hero-teks">
            <h1 className="masuk" style={{ '--urut': 1 }}>Program<br />Magang Akademik</h1>
            <p className="hero-lead masuk" style={{ '--urut': 2 }}>
              SIGMA UG menginformasikan syarat mahasiswa, periode pengajuan surat permohonan magang, konfirmasi penerimaan, hingga konversi mata kuliah magang bagi seluruh mahasiswa Prodi Sistem Informasi.
            </p>
            <div className="hero-aksi masuk" style={{ '--urut': 3 }}>
              <Link to="/masuk" className="btn-utama">
                Ajukan Surat Rekomendasi
                <img src={icon('arrow-right')} alt="" width="22" height="22" />
              </Link>
              <a href="#periode" className="btn-garis">
                <img src={icon('calendar-lg')} alt="" width="22" height="22" />
                Lihat Periode Magang
              </a>
            </div>
            <ul className="hero-poin masuk" style={{ '--urut': 4 }}>
              <li>Satu pintu</li>
              <li>Surat terbit otomatis</li>
              <li>Status bisa dipantau</li>
            </ul>
          </div>
          <VisualHero />
        </div>
      </section>



      <section id="periode" className="pengumuman">
        <div className="wrap">
          <h2 className="reveal"><img src={icon('announcement')} alt="" width="44" height="44" />Pengumuman Periode Magang</h2>
          <div className="kartu-grid">
            {periode?.tersedia && periode.jadwal.map((j) => <KartuPeriode key={j.jenis} j={j} />)}
            {(galatPeriode || (periode && !periode.tersedia)) && (
              <div className="belum-periode" role="status">
                <span className="belum-ikon" aria-hidden="true">!</span>
                <div>
                  <strong>Belum ada pengumuman periode magang</strong>
                  <p>
                    {galatPeriode
                      ? 'Informasi periode belum dapat dimuat saat ini. Silakan muat ulang halaman beberapa saat lagi.'
                      : 'Program Studi belum mengumumkan jadwal pengajuan surat rekomendasi dan konversi SKS. Pengumuman akan tampil di sini begitu periode dibuka, jadi silakan cek kembali secara berkala.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="tahapan" className="tahapan wrap">
        <h2 className="reveal">Tahapan Program Magang</h2>
        <p className="tahapan-sub reveal">Lima langkah dari pengajuan surat sampai surat konversi di tangan Anda.</p>
        <ol className="langkah">
          {langkah.map(([ikon, judul, isi], i) => (
            <li key={judul} className="reveal" style={{ '--urut': i }}>
              <span className="lingkar"><img src={icon(ikon)} alt="" width="34" height="34" /></span>
              <span className="nomor">{String(i + 1).padStart(2, '0')}</span>
              <h3>{judul}</h3>
              <p>{isi}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="syarat" className="syarat">
        <div className="wrap syarat-grid">
          <div className="kartu-syarat reveal">
            <p className="label">SYARAT MAHASISWA</p>
            <h3>Yang diperlukan untuk mengikuti magang</h3>
            <ul className="daftar-syarat">
              {syarat(periode?.tahun_akademik).map((s) => <li key={s}><img src={icon('check')} alt="" width="30" height="30" />{s}</li>)}
            </ul>
          </div>
          <div className="kartu-syarat reveal" style={{ '--urut': 1 }}>
            <p className="label">MITRA MAGANG</p>
            <h3>Jenis perusahaan penerima magang</h3>
            <ul className="daftar-mitra">
              {(periode?.kategori_diizinkan?.length ? periode.kategori_diizinkan : MITRA_UMUM).map((m) => <li key={m}><img src={icon('enterprise')} alt="" width="26" height="26" />{m}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section id="tanya" className="tanya wrap">
        <h2 className="reveal">Pertanyaan yang sering diajukan</h2>
        <div className="tanya-daftar reveal">
          {tanya.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="ajakan wrap reveal">
        <Maskot pose="laptop" className="maskot-cta" />
        <div>
          <h2>Siap mengajukan surat rekomendasi?</h2>
          <p>Masuk ke SIGMA UG, lengkapi data diri, dan ajukan dalam beberapa menit.</p>
        </div>
        <Link to="/masuk" className="btn-kuning-besar">Masuk Mahasiswa</Link>
      </section>

      <footer className="lp-footer">
        <div className="wrap footer-isi">
          <Merek kecil />
          <div className="footer-desk">
            <p>Sistem Informasi Gerbang Magang Akademik</p>
            <p>Program Studi Sistem Informasi</p>
          </div>
          <div className="footer-kol">
            <p className="footer-judul">TAUTAN</p>
            <a href="#periode">Periode Magang</a>
            <a href="#tahapan">Tahapan</a>
            <a href="#syarat">Syarat &amp; Ketentuan</a>
            <Link to="/masuk">Masuk Mahasiswa</Link>
          </div>
          <div className="footer-kol kontak">
            <p className="footer-judul">KONTAK LAYANAN MAGANG</p>
            <p><img src={icon('location')} alt="" width="20" height="20" />{kontak.alamat}</p>
            <p><img src={icon('phone')} alt="" width="16" height="16" />{kontak.telepon}</p>
            <p><img src={icon('mail')} alt="" width="19" height="19" />{kontak.email}</p>
          </div>
        </div>
        <p className="hak-cipta">© 2026 Program Studi Sistem Informasi · Fakultas Ilmu Komputer dan Teknologi Informasi · Universitas Gunadarma</p>
      </footer>
    </div>
  );
}
