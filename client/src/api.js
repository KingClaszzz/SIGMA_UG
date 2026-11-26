import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { beritahu } from './components/Pemberitahuan.jsx';

async function header() {
  const { data } = (await supabase?.auth.getSession()) ?? {};
  return data?.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

// Akun sedang dipakai di perangkat lain: keluar dari sesi ini saja (akun milik perangkat lain tidak dilepas), lalu beri tahu di halaman masuk.
async function akunDipakaiLain() {
  await supabase?.auth.signOut({ scope: 'local' });
  window.location.assign('/masuk?sesi=lain');
}

// Satu pintu ke API. `berkas` mengirim PDF mentah (nama asli lewat header X-Filename).
export async function api(path, { method = 'GET', body, berkas } = {}) {
  const headers = await header();
  let payload;
  if (berkas) {
    headers['Content-Type'] = 'application/pdf';
    headers['X-Filename'] = encodeURIComponent(berkas.name);
    payload = berkas;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => null);
  if (res.status === 409 && data?.kode === 'SESI_LAIN') await akunDipakaiLain();
  if (!res.ok) throw new Error(data?.error ?? (res.status >= 500 ? 'Server tidak merespons. Pastikan server API berjalan, lalu muat ulang halaman.' : 'Terjadi kesalahan.'));
  return data;
}

// Berkas dilindungi token, jadi tidak bisa dibuka lewat <a href>: ambil dulu, lalu tampilkan di tab baru.
// `body` (opsional) dikirim sebagai POST JSON, mis. pratinjau surat dengan isian admin.
export async function bukaBerkas(path, body) {
  const tab = window.open('', '_blank'); // dibuka sekarang agar tidak diblokir pemblokir popup
  try {
    const res = await fetch(`/api${path}`, body === undefined
      ? { headers: await header() }
      : { method: 'POST', headers: { ...(await header()), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Berkas tidak dapat dibuka.');
    const url = URL.createObjectURL(await res.blob());
    tab.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    tab?.close();
    throw e;
  }
}

// Untuk pratinjau (iframe) dan unduhan: ambil PDF dengan token lalu jadikan blob lokal. Pemanggil wajib URL.revokeObjectURL bila sudah selesai.
export async function ambilBlobUrl(path) {
  const res = await fetch(`/api${path}`, { headers: await header() });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Berkas tidak dapat dibuka.');
  return URL.createObjectURL(await res.blob());
}

export async function unduhBerkas(path, nama) {
  const url = await ambilBlobUrl(path);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// `muat` mengambil ulang data setelah perubahan.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null });
  // path kosong (null) = tidak mengambil apa pun, untuk formulir "baru" yang berbagi halaman dengan formulir ubah.
  const muat = useCallback(
    () => (path ? api(path).then((data) => setState({ data, error: null }), (error) => setState((s) => ({ ...s, error }))) : Promise.resolve()),
    [path],
  );
  useEffect(() => {
    setState({ data: null, error: null });
    muat();
  }, [muat]);
  return { ...state, muat };
}

// Menjalankan aksi (kirim ke server) dengan status sibuk/galat; `muat` mengambil ulang data setelah berhasil.
// `pesan` (opsional) = { judul, teks } atau fungsi(hasil) → pemberitahuan mengambang di tengah layar; galatnya ikut ditampilkan.
export function useAksi(muat) {
  const [state, setState] = useState({ sibuk: false, galat: null });
  async function jalan(fn, pesan) {
    setState({ sibuk: true, galat: null });
    try {
      const hasil = await fn();
      await muat?.();
      setState({ sibuk: false, galat: null });
      if (pesan) beritahu(typeof pesan === 'function' ? pesan(hasil) : pesan);
      return hasil;
    } catch (e) {
      setState({ sibuk: false, galat: e.message });
      if (pesan) beritahu({ jenis: 'galat', judul: 'Tindakan gagal', teks: e.message });
    }
  }
  return { ...state, jalan };
}
