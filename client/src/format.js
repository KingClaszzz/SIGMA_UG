const opsi = { timeZone: 'UTC' };
// Timestamp dari server (UTC) dibaca sebagai tanggal di Jakarta; tanggal polos (YYYY-MM-DD) dipakai apa adanya.
const hariJakarta = (iso) => (iso.length > 10 ? new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }) : iso);
const tgl = (iso) => new Date(`${hariJakarta(iso)}T00:00:00Z`);

export const tanggalPanjang = (iso) => tgl(iso).toLocaleDateString('id-ID', { ...opsi, day: 'numeric', month: 'long', year: 'numeric' });
export const tanggalAngka = (iso) => tgl(iso).toLocaleDateString('id-ID', { ...opsi, day: '2-digit', month: '2-digit', year: 'numeric' });

// "1 Juli – 31 Agustus 2026"
export function rentang(buka, tutup) {
  const dari = tgl(buka).toLocaleDateString('id-ID', { ...opsi, day: 'numeric', month: 'long' });
  return `${dari} – ${tanggalPanjang(tutup)}`;
}

export const rentangOpsional = (mulai, selesai) => (mulai && selesai ? rentang(mulai, selesai) : tanggalPanjang(mulai ?? selesai));

// "JULI-AGUSTUS"
export function labelBulan(buka, tutup) {
  const bulan = (iso) => tgl(iso).toLocaleDateString('id-ID', { ...opsi, month: 'long' }).toUpperCase();
  return bulan(buka) === bulan(tutup) ? bulan(buka) : `${bulan(buka)}-${bulan(tutup)}`;
}

// Sisa hari sampai tanggal (0 = hari ini, negatif = lewat).
export const sisaHari = (iso) => Math.round((tgl(iso) - tgl(new Date().toISOString())) / 86_400_000);

// Estimasi durasi magang: "3 bulan" / "2 bulan 10 hari" / "12 hari".
export function durasi(mulai, selesai) {
  if (!mulai || !selesai || selesai < mulai) return '–';
  const hari = Math.round((tgl(selesai) - tgl(mulai)) / 86_400_000) + 1;
  const bulan = Math.floor(hari / 30);
  const sisa = hari % 30;
  return [bulan && `${bulan} bulan`, sisa && `${sisa} hari`].filter(Boolean).join(' ');
}

export const ukuranBerkas = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

// "5 menit lalu", "2 jam lalu", "Kemarin", "3 hari lalu"; lebih lama dari seminggu memakai tanggal.
export function waktuRelatif(iso) {
  const menit = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60_000));
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  if (menit < 1440) return `${Math.floor(menit / 60)} jam lalu`;
  const hari = Math.floor(menit / 1440);
  return hari === 1 ? 'Kemarin' : hari < 7 ? `${hari} hari lalu` : tanggalAngka(iso);
}
