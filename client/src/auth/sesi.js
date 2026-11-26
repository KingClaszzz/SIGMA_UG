import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { supabase } from '../supabase';

// Sesi Supabase saat ini. memuat = belum tahu; sesi = null berarti belum masuk.
export function useSesi() {
  const [state, setState] = useState({ memuat: true, sesi: null });
  useEffect(() => {
    if (!supabase) return setState({ memuat: false, sesi: null });
    supabase.auth.getSession().then(({ data }) => setState({ memuat: false, sesi: data.session }));
    const { data } = supabase.auth.onAuthStateChange((_event, sesi) => setState({ memuat: false, sesi }));
    return () => data.subscription.unsubscribe();
  }, []);
  return state;
}

export async function keluar() {
  await api('/keluar', { method: 'POST' }).catch(() => {}); // lepaskan akun agar bisa dipakai di perangkat lain
  await supabase?.auth.signOut();
}

// NFR-02: sesi berakhir otomatis setelah 30 menit tanpa aktivitas.
export function useKeluarOtomatis(menit = 30) {
  const navigate = useNavigate();
  const timer = useRef();
  useEffect(() => {
    const mulai = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await keluar();
        navigate('/masuk?sesi=habis', { replace: true });
      }, menit * 60_000);
    };
    const peristiwa = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    peristiwa.forEach((e) => window.addEventListener(e, mulai, { passive: true }));
    mulai();
    return () => {
      clearTimeout(timer.current);
      peristiwa.forEach((e) => window.removeEventListener(e, mulai));
    };
  }, [menit, navigate]);
}

// Pesan galat Supabase Auth → bahasa Indonesia yang jelas.
export function pesanAuth(error) {
  const m = error?.message ?? '';
  if (/invalid login credentials/i.test(m)) return 'Email atau kata sandi salah.';
  if (/email not confirmed/i.test(m)) return 'Email belum dikonfirmasi. Periksa kotak masuk Anda.';
  if (/already registered|already been registered/i.test(m)) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (/password should be at least/i.test(m)) return 'Kata sandi minimal 8 karakter.';
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'Login Google belum diaktifkan pada server autentikasi (Supabase).';
  if (/access_denied|user denied|cancel/i.test(m)) return 'Login Google dibatalkan.';
  if (/identity.*already|email.*exists/i.test(m)) return 'Email ini sudah terhubung dengan metode masuk lain.';
  if (/rate limit|too many/i.test(m)) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (/fetch|network/i.test(m)) return 'Tidak dapat terhubung. Periksa koneksi internet Anda.';
  return 'Terjadi kesalahan. Silakan coba lagi.';
}

export function ambilGalatOAuth(search, hash) {
  const q = new URLSearchParams(search || '');
  const h = new URLSearchParams((hash || '').replace(/^#/, ''));
  const kode = q.get('error') ?? h.get('error');
  const ket = q.get('error_description') ?? h.get('error_description');
  if (!kode && !ket) return null;
  return pesanAuth({ message: `${kode ?? ''} ${ket ?? ''}` });
}

// Beranda tiap peran. Peran dibaca dari server (tabel users), bukan dari token, supaya tidak bisa dipalsukan di klien.
const BERANDA = { mahasiswa: '/dashboard', admin: '/admin', dosen: '/dosen' };
export const arahDari = (peran) => BERANDA[peran] ?? '/';

export function usePeran(sesi) {
  const idPengguna = sesi?.user?.id ?? null;
  const [state, setState] = useState({ untuk: null, memuat: !!idPengguna, peran: null, galat: null });
  useEffect(() => {
    if (!idPengguna) return;
    let batal = false;
    api('/saya').then(
      (d) => !batal && setState({ untuk: idPengguna, memuat: false, peran: d.peran, galat: null }),
      (galat) => !batal && setState({ untuk: idPengguna, memuat: false, peran: null, galat }),
    );
    return () => { batal = true; };
  }, [idPengguna]);
  if (!idPengguna) return { memuat: false, peran: null, galat: null };
  if (state.untuk !== idPengguna) return { memuat: true, peran: null, galat: null };
  return state;
}

// Pengaman rute per peran: status 'memuat' | 'galat' | 'tolak' (alihkan ke `ke`) | 'ok'.
export function useAkses(peran) {
  const { memuat, sesi } = useSesi();
  const { pathname } = useLocation();
  const p = usePeran(sesi);
  if (memuat || (sesi && p.memuat)) return { status: 'memuat' };
  if (!sesi) return { status: 'tolak', ke: '/masuk', state: { dari: pathname } };
  if (p.galat) return { status: 'galat', galat: p.galat };
  if (p.peran !== peran) return { status: 'tolak', ke: arahDari(p.peran) };
  return { status: 'ok' };
}
