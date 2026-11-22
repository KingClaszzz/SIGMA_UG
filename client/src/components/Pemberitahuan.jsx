// Pemberitahuan mengambang di tengah layar untuk tindakan penting (setuju, tolak, kirim, simpan). Dipasang sekali di App.jsx.
// Pemakaian dari mana saja: beritahu({ judul: 'Pengajuan disetujui', teks: '…', jenis: 'ok' | 'galat' | 'info' }).
import { useEffect, useState } from 'react';
import './pemberitahuan.css';

let tampilkan = null;
export const beritahu = (n) => tampilkan?.({ jenis: 'ok', ...n, id: Date.now() });

const IKON = { ok: '✓', galat: '✕', info: 'i' };

export default function Pemberitahuan() {
  const [n, setN] = useState(null);
  useEffect(() => {
    tampilkan = setN;
    return () => { tampilkan = null; };
  }, []);
  useEffect(() => {
    if (!n) return undefined;
    const t = setTimeout(() => setN(null), n.jenis === 'galat' ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [n]);
  if (!n) return null;
  return (
    <div className="notif-tengah-latar" onClick={() => setN(null)}>
      <div key={n.id} className={`notif-tengah ${n.jenis}`} role={n.jenis === 'galat' ? 'alert' : 'status'}>
        <span className="notif-tengah-ikon" aria-hidden="true">{IKON[n.jenis]}</span>
        <div>
          <strong>{n.judul}</strong>
          {n.teks && <p>{n.teks}</p>}
        </div>
      </div>
    </div>
  );
}
