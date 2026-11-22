// Maskot SIGMA: satu gambar utuh (tanpa dipotong-potong, jadi tidak ada sambungan antarbagian) yang bergerak lewat transform halus.
// Interaksi: bernapas pelan, mata berkedip acak, kepala condong mengikuti kursor, goyang saat disentuh, dan reaksi lucu + ucapan saat diklik.
import { useEffect, useRef, useState } from 'react';
import { OWL } from '../assets';
import './maskot.css';

const UCAPAN = ['Halo! 👋', 'Semangat magangnya!', 'Sudah cek surat rekomendasimu?', 'Aku SIGMA!', 'Hore! 🎉', 'Jangan lupa unggah dokumennya ya', 'Kita pasti bisa!'];
const REAKSI = ['r-lompat', 'r-joget', 'r-salto', 'r-putar'];
const gerakDikurangi = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// pose: 'jas' | 'laptop' | 'papan'. bicara: tampilkan gelembung ucapan saat diklik. lacak: condong mengikuti kursor.
export default function Maskot({ pose = 'jas', className = '', bicara = true, lacak = true, onKlik }) {
  const o = OWL[pose];
  const tombol = useRef(null);
  const miring = useRef(null);
  const badan = useRef(null);
  const urut = useRef(0);
  const [senang, setSenang] = useState(false);
  const [ucap, setUcap] = useState(null);

  // Kedip acak (kadang dua kali berturut-turut), memakai Web Animations supaya kelopak menutup dan membuka dengan easing.
  useEffect(() => {
    if (gerakDikurangi()) return undefined;
    let t;
    const kedip = () => {
      if (tombol.current?.classList.contains('senang')) return;
      tombol.current?.querySelectorAll('.owl-mata').forEach((m) => m.animate(
        [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)', offset: 0.45 }, { transform: 'scaleY(0)' }],
        { duration: 190, easing: 'ease-in-out' },
      ));
    };
    const jadwal = () => {
      t = setTimeout(() => { kedip(); if (Math.random() < 0.22) setTimeout(kedip, 280); jadwal(); }, 2200 + Math.random() * 3600);
    };
    jadwal();
    return () => clearTimeout(t);
  }, []);

  // Kepala condong ke arah kursor. Hanya transform pada pembungkus, jadi seluruh gambar bergerak bersama dan tidak ada celah.
  useEffect(() => {
    if (!lacak || gerakDikurangi() || !window.matchMedia('(pointer: fine)').matches) return undefined;
    let raf = 0;
    const gerak = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = miring.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / Math.max(320, window.innerWidth / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.3)) / Math.max(260, window.innerHeight / 2)));
        el.style.setProperty('--dx', dx.toFixed(3));
        el.style.setProperty('--dy', dy.toFixed(3));
      });
    };
    const pergi = () => { miring.current?.style.setProperty('--dx', 0); miring.current?.style.setProperty('--dy', 0); };
    window.addEventListener('pointermove', gerak, { passive: true });
    document.addEventListener('pointerleave', pergi);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', gerak); document.removeEventListener('pointerleave', pergi); };
  }, [lacak]);

  function klik() {
    onKlik?.();
    window.dispatchEvent(new Event('maskot-letup'));
    if (bicara) {
      setUcap(UCAPAN[Math.floor(Math.random() * UCAPAN.length)]);
      setTimeout(() => setUcap(null), 2000);
    }
    if (gerakDikurangi()) return;
    const el = badan.current;
    REAKSI.forEach((k) => el.classList.remove(k));
    void el.offsetWidth; // paksa reflow agar reaksi yang sama bisa diputar ulang
    el.classList.add(REAKSI[urut.current++ % REAKSI.length]);
    setSenang(true); // mata terpejam gembira
    setTimeout(() => setSenang(false), 1300);
  }
  const selesai = (e) => { if (e.target === e.currentTarget) REAKSI.forEach((k) => e.currentTarget.classList.remove(k)); };

  return (
    <button type="button" ref={tombol} className={`owl ${senang ? 'senang' : ''} ${className}`} aria-label="Sapa maskot SIGMA" onClick={klik}>
      {ucap && <span className="owl-gelembung" role="status">{ucap}</span>}
      <span className="owl-bayangan" aria-hidden="true" />
      <span className="owl-miring" ref={miring}>
        <span className="owl-badan" ref={badan} onAnimationEnd={selesai}>
          <img src={o.src} alt="" width={o.w} height={o.h} draggable="false" />
          <svg className="owl-kelopak" viewBox={`0 0 ${o.w} ${o.h}`} aria-hidden="true">
            {o.mata.map((m, i) => (
              <g key={i} className="owl-mata">
                <ellipse cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} fill={o.warna} />
                <path className="garis-kedip" d={`M${m.cx - m.rx * 0.55} ${m.cy + m.ry * 0.1} Q${m.cx} ${m.cy + m.ry * 0.5} ${m.cx + m.rx * 0.55} ${m.cy + m.ry * 0.1}`} />
                <path className="garis-senang" d={`M${m.cx - m.rx * 0.55} ${m.cy + m.ry * 0.25} Q${m.cx} ${m.cy - m.ry * 0.45} ${m.cx + m.rx * 0.55} ${m.cy + m.ry * 0.25}`} />
              </g>
            ))}
          </svg>
        </span>
      </span>
    </button>
  );
}
