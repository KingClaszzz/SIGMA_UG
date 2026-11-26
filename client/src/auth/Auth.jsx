import Muat from '../components/Muat.jsx';
// HALAMAN MASUK, DAFTAR, LUPA KATA SANDI (publik). Dipakai semua peran: setelah masuk, peran dibaca server dari
// tabel users, sehingga Admin Prodi dan Dosen Pendamping cukup diarahkan ke dasbor masing-masing (lihat arahPeran).
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { icon, logo } from '../assets';
import { api } from '../api';
import { PESAN_ALAMAT, PESAN_NPM, POLA_NPM, REGEX_ALAMAT, rapikanAlamat } from '../format';
import { supabase, supabaseSiap } from '../supabase';
import { arahDari, ambilGalatOAuth, keluar, pesanAuth, usePeran, useSesi } from './sesi';
import './auth.css';

// Setelah masuk, /arah mencari tahu peran pengguna lalu mengirimnya ke beranda yang sesuai.
const arahPeran = '/arah';
const FITUR = [
  ['Ajukan surat rekomendasi online', <img key="a" src={icon('nav-surat')} alt="" width="18" height="18" />],
  ['Pantau status pengajuan', <svg key="b" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0b849" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>],
  ['Unduh surat konversi SKS', <img key="c" src={icon('nav-konversi')} alt="" width="18" height="18" />],
];

function Tata({ judul, sub, children, kaki }) {
  return (
    <div className="auth">
      <aside className="auth-samping">
        <div className="auth-pesan">
          <Link to="/" className="auth-merek"><img src={logo} alt="" width="32" height="32" />SIGMA UG</Link>
          <h2>Sistem Informasi Gerbang Mahasiswa Akademik</h2>
          <p>Ruang digital untuk pengajuan magang Prodi Sistem Informasi.</p>
          <ul>
            {FITUR.map(([teks, ikon]) => <li key={teks}><span className="auth-ikon">{ikon}</span>{teks}</li>)}
          </ul>
        </div>
      </aside>
      <main className="auth-isi">
        <div className="auth-kartu masuk">
          <Link to="/" className="auth-kembali">← Kembali ke beranda</Link>
          <h1>{judul}</h1>
          {sub && <p className="auth-sub">{sub}</p>}
          {!supabaseSiap && <p className="banner-peringatan" role="alert"><strong>Supabase belum dikonfigurasi</strong>Isi client/.env (VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY) lalu jalankan ulang klien.</p>}
          {children}
          <p className="auth-kaki">{kaki}</p>
        </div>
      </main>
    </div>
  );
}

function Kolom({ label, ...props }) {
  return <label>{label}<input {...props} /></label>;
}

// Kolom kata sandi dengan tombol tampil/sembunyi (desain Figma). `tambahan` = tautan di sisi kanan label.
function Sandi({ label, tambahan, ...props }) {
  const [lihat, setLihat] = useState(false);
  return (
    <label>
      <span className="auth-label">{label}{tambahan}</span>
      <span className="auth-sandi">
        <input {...props} type={lihat ? 'text' : 'password'} />
        <button type="button" className="auth-mata" aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setLihat(!lihat)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{lihat && <path d="M3 3l18 18" />}</svg>
        </button>
      </span>
    </label>
  );
}

// Galat yang pesannya sudah ditulis untuk pengguna (bukan galat Supabase yang perlu diterjemahkan).
const galatForm = (pesan) => Object.assign(new Error(pesan), { tampil: true });

function useKirim(fn) {
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  async function kirim(e) {
    e.preventDefault();
    setGalat(null);
    setSibuk(true);
    try {
      await fn(new FormData(e.target));
    } catch (err) {
      setGalat(err.tampil ? err.message : pesanAuth(err));
    } finally {
      setSibuk(false);
    }
  }
  return { galat, sibuk, kirim };
}

export function Masuk() {
  const { memuat, sesi } = useSesi();
  const navigate = useNavigate();
  const { state, search, hash } = useLocation();
  const [params] = useSearchParams();
  const { galat, sibuk, kirim } = useKirim(async (f) => {
    const { error } = await supabase.auth.signInWithPassword({ email: f.get('email').trim(), password: f.get('password') });
    if (error) throw error;
    navigate(state?.dari ?? arahPeran, { replace: true });
  });
  const [galatGoogle, setGalatGoogle] = useState(null);
  const [sibukGoogle, setSibukGoogle] = useState(false);

  if (!memuat && sesi) return <Navigate to={arahPeran} replace />;

  async function google() {
    setGalatGoogle(null);
    setSibukGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${arahPeran}` } });
      if (error) setGalatGoogle(pesanAuth(error));
    } catch (err) {
      setGalatGoogle(pesanAuth(err));
    } finally {
      setSibukGoogle(false);
    }
  }

  const galatTampil = galat ?? galatGoogle ?? ambilGalatOAuth(search, hash) ?? state?.galatAuth;

  return (
    <Tata judul="Selamat datang kembali" kaki={<>Belum punya akun? <Link to="/daftar">Daftar</Link></>}>
      {params.get('sesi') === 'lain' && <p className="pesan galat" role="alert">Akun ini sedang digunakan di perangkat lain. Silakan keluar (logout) dari perangkat tersebut terlebih dahulu, lalu masuk kembali di sini.</p>}
      {params.get('sesi') === 'habis' && <p className="banner-info" role="status">Sesi berakhir karena tidak ada aktivitas selama 30 menit. Silakan masuk kembali.</p>}
      <form onSubmit={kirim} className="auth-form">
        <Kolom label="Email" name="email" type="email" autoComplete="email" required />
        <Sandi label="Kata sandi" tambahan={<Link to="/lupa-password" className="auth-lupa">Lupa kata sandi?</Link>} name="password" autoComplete="current-password" required />
        {galatTampil && <p className="pesan galat" role="alert">{galatTampil}</p>}
        <button className="btn isi auth-tombol" type="submit" disabled={sibuk || sibukGoogle || !supabaseSiap}>{sibuk ? 'Memproses…' : 'Masuk'}</button>
      </form>
      <div className="auth-pemisah"><span>atau</span></div>
      <button type="button" className="btn garis auth-tombol" onClick={google} disabled={sibuk || sibukGoogle || !supabaseSiap}>
        <span className="g-huruf" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg></span>
        Masuk dengan Google
      </button>
    </Tata>
  );
}

// Dua langkah seperti desain: (1) akun, (2) data akademik. Data langkah 2 disimpan sebagai metadata akun dan mengisi otomatis
// formulir Data Diri saat pertama masuk (mahasiswa/Profile.jsx); verifikasi data tetap oleh Admin Prodi (FR-16).
export function Daftar() {
  const navigate = useNavigate();
  const [langkah, setLangkah] = useState(1);
  const [isi, setIsi] = useState({});
  const [terkirim, setTerkirim] = useState(null);
  const [galatLokal, setGalatLokal] = useState(null);
  const { galat, sibuk, kirim } = useKirim(async (f) => {
    const data = { ...isi, ...Object.fromEntries(f) };
    const alamat = rapikanAlamat(data.alamat);
    if (!REGEX_ALAMAT.test(alamat)) throw galatForm(PESAN_ALAMAT);
    const { tersedia } = await api(`/publik/telepon/${data.no_telepon.trim()}`).catch((e) => { throw galatForm(e.message); });
    if (!tersedia) throw galatForm('Nomor telepon ini sudah dipakai akun lain.');
    const { data: hasil, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: { data: { nama: data.nama.trim(), npm: data.npm.trim(), semester: data.semester, ipk: data.ipk, no_telepon: data.no_telepon.trim(), alamat }, emailRedirectTo: `${window.location.origin}/masuk` },
    });
    if (error) throw error;
    if (hasil.session) navigate(arahPeran, { replace: true });
    else setTerkirim(data.email.trim());
  });

  async function lanjut(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (f.password !== f.ulang) return setGalatLokal('Kata sandi dan konfirmasinya tidak sama.');
    try {
      const { tersedia } = await api(`/publik/npm/${f.npm.trim()}`);
      if (!tersedia) return setGalatLokal('NPM ini sudah terdaftar pada akun lain. Jika ini NPM Anda, hubungi Admin Prodi.');
    } catch (err) {
      return setGalatLokal(err.message);
    }
    setGalatLokal(null);
    setIsi(f);
    setLangkah(2);
  }

  if (terkirim) {
    return (
      <Tata judul="Periksa email Anda" sub={`Kami mengirim tautan konfirmasi ke ${terkirim}. Klik tautan itu, lalu masuk.`} kaki={<Link to="/masuk">Ke halaman masuk</Link>}>
        <p className="banner-ok" role="status"><strong>Pendaftaran berhasil</strong>Bila email tidak muncul dalam beberapa menit, periksa folder spam.</p>
      </Tata>
    );
  }
  return (
    <Tata judul="Daftar Akun" kaki={<>Sudah punya akun? <Link to="/masuk">Masuk</Link></>}>
      {langkah === 1 ? (
        <form onSubmit={lanjut} className="auth-form" key="l1">
          <Kolom label="Nama lengkap" name="nama" autoComplete="name" required maxLength={60} defaultValue={isi.nama} placeholder="Masukkan nama lengkap Anda" />
          <Kolom label="NPM" name="npm" required inputMode="numeric" pattern={POLA_NPM} title={PESAN_NPM} defaultValue={isi.npm} placeholder="Masukkan NPM Anda" />
          <Kolom label="Email" name="email" type="email" autoComplete="email" required defaultValue={isi.email} placeholder="Masukkan email Anda" />
          <Sandi label="Kata sandi (minimal 8 karakter)" name="password" autoComplete="new-password" minLength={8} required defaultValue={isi.password} placeholder="Masukkan kata sandi Anda" />
          <Sandi label="Konfirmasi kata sandi" name="ulang" autoComplete="new-password" minLength={8} required defaultValue={isi.ulang} placeholder="Ulangi kata sandi Anda" />
          {galatLokal && <p className="pesan galat" role="alert">{galatLokal}</p>}
          <button className="btn garis auth-tombol" type="submit">Selanjutnya →</button>
        </form>
      ) : (
        <form onSubmit={kirim} className="auth-form" key="l2">
          <Kolom label="Fakultas" value="Ilmu Komputer dan Teknologi Informasi" readOnly />
          <Kolom label="Jurusan" value="Sistem Informasi" readOnly />
          <label>Semester<select name="semester" required defaultValue={isi.semester ?? ''}><option value="" disabled>Pilih semester</option>{[5, 6, 7].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <Kolom label="IPK terakhir" name="ipk" type="number" min="0" max="4" step="0.01" required defaultValue={isi.ipk} placeholder="Masukkan IPK terakhir Anda" />
          <Kolom label="No. telepon" name="no_telepon" type="tel" required pattern="08[0-9]{8,11}" title="10–13 digit, diawali 08" defaultValue={isi.no_telepon} placeholder="Masukkan nomor telepon Anda" />
          <Kolom label="Alamat" name="alamat" required minLength={10} maxLength={200} title={PESAN_ALAMAT} defaultValue={isi.alamat} placeholder="Masukkan alamat rumah Anda" />
          {galat && <p className="pesan galat" role="alert">{galat}</p>}
          <button className="btn isi auth-tombol" type="submit" disabled={sibuk || !supabaseSiap}>{sibuk ? 'Memproses…' : 'Daftar'}</button>
          <button className="btn garis auth-tombol" type="button" onClick={() => setLangkah(1)}>← Kembali</button>
        </form>
      )}
    </Tata>
  );
}

export function LupaPassword() {
  const [terkirim, setTerkirim] = useState(false);
  const { galat, sibuk, kirim } = useKirim(async (f) => {
    const { error } = await supabase.auth.resetPasswordForEmail(f.get('email').trim(), { redirectTo: `${window.location.origin}/atur-ulang-password` });
    if (error) throw error;
    setTerkirim(true);
  });
  return (
    <Tata judul="Lupa Password?" sub="Masukkan email yang terdaftar pada akun SIGMA UG untuk menerima tautan pengaturan ulang." kaki={<Link to="/masuk">← Kembali ke halaman masuk</Link>}>
      {terkirim ? (
        <p className="banner-ok" role="status"><strong>Tautan terkirim</strong>Bila email terdaftar, tautan pengaturan ulang akan tiba dalam beberapa menit.</p>
      ) : (
        <form onSubmit={kirim} className="auth-form">
          <Kolom label="Email" name="email" type="email" autoComplete="email" required />
          {galat && <p className="pesan galat" role="alert">{galat}</p>}
          <button className="btn isi auth-tombol" type="submit" disabled={sibuk || !supabaseSiap}>{sibuk ? 'Memproses…' : 'Kirim Tautan'}</button>
        </form>
      )}
    </Tata>
  );
}

// Tujuan tautan di email. Supabase memasang sesi sementara dari tautan, lalu pengguna memilih kata sandi baru.
export function AturUlangPassword() {
  const { memuat, sesi } = useSesi();
  const navigate = useNavigate();
  const { galat, sibuk, kirim } = useKirim(async (f) => {
    if (f.get('password') !== f.get('ulang')) throw new Error('Kata sandi dan konfirmasinya tidak sama.');
    const { error } = await supabase.auth.updateUser({ password: f.get('password') });
    if (error) throw error;
    navigate(arahPeran, { replace: true });
  });
  useEffect(() => { document.title = 'Atur Ulang Kata Sandi · SIGMA UG'; }, []);

  return (
    <Tata judul="Atur ulang kata sandi" sub="Pilih kata sandi baru untuk akun Anda." kaki={<Link to="/masuk">← Kembali ke halaman masuk</Link>}>
      {!memuat && !sesi ? (
        <p className="banner-galat" role="alert"><strong>Tautan tidak valid</strong>Tautan sudah kedaluwarsa. <Link to="/lupa-password">Minta tautan baru</Link>.</p>
      ) : (
        <form onSubmit={kirim} className="auth-form">
          <Kolom label="Kata sandi baru (minimal 8 karakter)" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <Kolom label="Ulangi kata sandi" name="ulang" type="password" autoComplete="new-password" minLength={8} required />
          {galat && <p className="pesan galat" role="alert">{galat}</p>}
          <button className="btn isi auth-tombol" type="submit" disabled={sibuk || memuat}>{sibuk ? 'Menyimpan…' : 'Simpan Kata Sandi'}</button>
        </form>
      )}
    </Tata>
  );
}

export function ArahPeran() {
  const { memuat, sesi } = useSesi();
  const navigate = useNavigate();
  const { search, hash } = useLocation();
  const p = usePeran(sesi);
  const galatUrl = ambilGalatOAuth(search, hash);

  useEffect(() => {
    if (!p.galat && !galatUrl) return;
    let aktif = true;
    (async () => {
      await keluar();
      if (aktif) navigate('/masuk', { replace: true, state: { galatAuth: galatUrl ?? p.galat?.message } });
    })();
    return () => { aktif = false; };
  }, [p.galat, galatUrl, navigate]);

  if (galatUrl || p.galat || memuat || (sesi && p.memuat)) return <Muat penuh />;
  if (!sesi) return <Navigate to="/masuk" replace />;
  return <Navigate to={arahDari(p.peran)} replace />;
}
