// PERAN: ADMIN PRODI — lonceng notifikasi (desain Figma: daftar peristiwa, titik belum dibaca, "Tandai Semua Dibaca", "Lihat Detail").
// Peristiwa dihitung server dari data yang ada; yang disimpan server hanya waktu terakhir "Tandai Semua Dibaca".
// Item yang sudah dibuka lewat "Lihat Detail" dicatat di peramban supaya titik merahnya hilang satu per satu.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api';
import { useTutupLuar } from '../components/Kerangka.jsx';
import { waktuRelatif } from '../format';

// `dasar` = awalan API peran pemilik lonceng ('/admin' atau '/dosen').
export default function Notifikasi({ dasar = '/admin' }) {
  const { data, muat } = useApi(`${dasar}/notifikasi`);
  const [open, setOpen] = useState(false);
  const ref = useTutupLuar(open, setOpen);
  const simpan = `sigma-notif-dibaca:${dasar}`;
  const [dibaca, setDibaca] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(simpan) ?? '[]')); } catch { return new Set(); }
  });
  const idItem = (x) => `${x.judul}|${x.nama}|${x.waktu}`;
  const baru = (x) => x.baru && !dibaca.has(idItem(x));
  const tandai = (x) => {
    const s = new Set(dibaca).add(idItem(x));
    setDibaca(s);
    try { localStorage.setItem(simpan, JSON.stringify([...s].slice(-200))); } catch { /* peramban memblokir penyimpanan: titik merah kembali setelah dimuat ulang */ }
  };
  const belum = Math.max(0, (data?.belum_dibaca ?? 0) - (data?.item ?? []).filter((x) => x.baru && !baru(x)).length);

  return (
    <div className="lonceng" ref={ref}>
      <button type="button" className="lonceng-btn" aria-label={`Notifikasi, ${belum} belum dibaca`} aria-expanded={open} onClick={() => { setOpen(!open); if (!open) muat(); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {belum > 0 && <span className="lonceng-angka">{belum > 99 ? '99+' : belum}</span>}
      </button>
      {open && (
        <div className="menu lonceng-menu notif-menu" role="menu">
          <div className="notif-kepala">
            <strong>Notifikasi</strong>
            {belum > 0 && <button type="button" className="aksi-kecil" onClick={async () => { await api(`${dasar}/notifikasi/baca`, { method: 'POST' }); muat(); }}>Tandai Semua Dibaca</button>}
          </div>
          {!data || data.item.length === 0 ? <p className="lonceng-kosong">Belum ada notifikasi.</p> : (
            <ul className="notif-daftar">
              {data.item.map((x, i) => (
                <li key={i} className={baru(x) ? 'baru' : ''}>
                  <span className="notif-titik" aria-hidden="true" />
                  <div>
                    <strong>{x.judul}</strong>
                    <p>{x.nama}{x.tambahan ? ` · ${x.tambahan}` : ''}</p>
                    <small>{waktuRelatif(x.waktu)}</small>
                  </div>
                  <Link to={x.to} role="menuitem" className="aksi-kecil" onClick={() => { tandai(x); setOpen(false); }}>Lihat Detail</Link>
                </li>
              ))}
            </ul>
          )}
          {dasar === '/admin' && (
            <div className="notif-kaki">
              <Link to="/admin/notifikasi-email" role="menuitem" className="aksi-kecil" onClick={() => setOpen(false)}>
                Log Pengiriman Email
              </Link>
              {data?.email_gagal > 0 && <span className="badge merah">{data.email_gagal} gagal</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
