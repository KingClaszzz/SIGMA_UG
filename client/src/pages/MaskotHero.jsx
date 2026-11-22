// Cincin partikel interaktif di belakang maskot hero: partikel mengorbit pelan, ikut bergeser (parallax) mengikuti kursor,
// terdorong menjauh saat kursor mendekat, dan memercik saat maskot diklik (peristiwa 'maskot-letup').
import { useEffect, useRef } from 'react';

const WARNA = [
  ['#5b2f8f', 0.55], ['#7c4dbd', 0.5], ['#8d63c9', 0.5], // ungu
  ['#c9b6ec', 0.9], ['#e0d4f5', 0.9], ['#b79ae0', 0.8], // lavender
];
const EMAS = '#f0b849';
const JARI = 105; // jarak kursor yang mulai mendorong partikel (px)

function buatPartikel(jumlah) {
  return Array.from({ length: jumlah }, (_, i) => {
    const emas = i % 7 === 0;
    const [warna, alfa] = emas ? [EMAS, 1] : WARNA[Math.floor(Math.random() * WARNA.length)];
    const ukuran = emas ? 2.2 + Math.random() * 2.4 : 1.4 + Math.pow(Math.random(), 1.7) * 5; // lebih banyak yang kecil
    return {
      sudut: (i / jumlah) * Math.PI * 2 + Math.random() * 0.4, // tersebar radial
      jari: 0.78 + Math.random() * 0.22, // 0.78–1.0 dari radius cincin
      ukuran, warna, alfa, emas,
      putar: (Math.random() < 0.5 ? -1 : 1) * (0.015 + Math.random() * 0.05), // rad/detik: mengorbit pelan
      fase: Math.random() * Math.PI * 2,
      x: 0, y: 0, vx: 0, vy: 0, siap: false,
    };
  });
}

export function Partikel() {
  const kanvas = useRef(null);

  useEffect(() => {
    const el = kanvas.current;
    const ctx = el.getContext('2d');
    const kurangGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lebar = 0, tinggi = 0, pusatX = 0, pusatY = 0, radius = 0;
    let partikel = [];
    const kursor = { x: null, y: null };
    const geser = { x: 0, y: 0 }; // offset parallax yang sudah dihaluskan
    const letupan = []; // percikan sesaat saat maskot diklik
    let raf = 0, tampil = true, waktu = performance.now();

    function ukur() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = el.getBoundingClientRect();
      lebar = r.width; tinggi = r.height;
      el.width = Math.round(lebar * dpr); el.height = Math.round(tinggi * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pusatX = lebar / 2; pusatY = tinggi / 2;
      radius = Math.min(lebar, tinggi) * 0.46;
      partikel = buatPartikel(lebar < 420 ? 44 : 72);
    }

    function target(p, t) {
      const a = p.sudut + p.putar * t;
      const kedalaman = 0.35 + p.ukuran / 7; // partikel besar bergeser lebih jauh: kesan berlapis
      return [
        pusatX + Math.cos(a) * radius * p.jari + geser.x * kedalaman,
        pusatY + Math.sin(a) * radius * p.jari + geser.y * kedalaman,
      ];
    }

    function gambar(t) {
      ctx.clearRect(0, 0, lebar, tinggi);
      for (const p of partikel) {
        const kedip = 0.75 + 0.25 * Math.sin(t * 1.6 + p.fase);
        ctx.globalAlpha = p.alfa * kedip;
        ctx.fillStyle = p.warna;
        ctx.shadowColor = p.emas ? EMAS : 'transparent';
        ctx.shadowBlur = p.emas ? 10 : 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.ukuran, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const c of letupan) {
        ctx.globalAlpha = Math.max(0, c.umur);
        ctx.fillStyle = c.warna;
        ctx.shadowColor = c.warna;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.ukuran * (0.4 + c.umur * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function langkah(sekarang) {
      raf = requestAnimationFrame(langkah);
      if (!tampil) return;
      const dt = Math.min((sekarang - waktu) / 1000, 0.05);
      waktu = sekarang;
      const t = sekarang / 1000;

      const gx = kursor.x == null ? 0 : Math.max(-1, Math.min(1, (kursor.x - pusatX) / (lebar / 2))) * 22;
      const gy = kursor.y == null ? 0 : Math.max(-1, Math.min(1, (kursor.y - pusatY) / (tinggi / 2))) * 22;
      geser.x += (gx - geser.x) * Math.min(1, dt * 4);
      geser.y += (gy - geser.y) * Math.min(1, dt * 4);

      for (const p of partikel) {
        const [tx, ty] = target(p, t);
        if (!p.siap) { p.x = tx; p.y = ty; p.siap = true; }
        p.vx += (tx - p.x) * 0.045;
        p.vy += (ty - p.y) * 0.045;
        if (kursor.x != null) {
          const dx = p.x - kursor.x, dy = p.y - kursor.y, d = Math.hypot(dx, dy);
          if (d < JARI && d > 0.01) {
            const dorong = (1 - d / JARI) ** 2 * 2.2; // makin dekat, makin kuat (kuadrat = halus di tepi)
            p.vx += (dx / d) * dorong;
            p.vy += (dy / d) * dorong;
          }
        }
        p.vx *= 0.86; p.vy *= 0.86;
        p.x += p.vx; p.y += p.vy;
      }
      for (let i = letupan.length - 1; i >= 0; i--) {
        const c = letupan[i];
        c.x += c.vx; c.y += c.vy; c.vy += 0.08; c.vx *= 0.97; c.umur -= dt * 1.1;
        if (c.umur <= 0) letupan.splice(i, 1);
      }
      gambar(t);
    }

    const meletup = () => {
      const warna = [EMAS, '#c9b6ec', '#e0d4f5', EMAS, '#b79ae0'];
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + Math.random() * 0.5, v = 2.5 + Math.random() * 3.5;
        letupan.push({ x: pusatX, y: pusatY + tinggi * 0.04, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, ukuran: 2 + Math.random() * 3.5, warna: warna[i % warna.length], umur: 1 });
      }
    };

    const gerak = (e) => {
      const r = el.getBoundingClientRect();
      kursor.x = e.clientX - r.left; kursor.y = e.clientY - r.top;
    };
    const lepas = () => { kursor.x = null; kursor.y = null; };

    ukur();
    const io = new IntersectionObserver(([e]) => { tampil = e.isIntersecting; });
    io.observe(el);
    const ro = new ResizeObserver(ukur);
    ro.observe(el);

    if (kurangGerak) {
      partikel.forEach((p) => { [p.x, p.y] = target(p, 0); });
      gambar(0);
    } else {
      window.addEventListener('pointermove', gerak, { passive: true });
      window.addEventListener('maskot-letup', meletup);
      document.addEventListener('pointerleave', lepas);
      raf = requestAnimationFrame(langkah);
    }
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      window.removeEventListener('pointermove', gerak);
      window.removeEventListener('maskot-letup', meletup);
      document.removeEventListener('pointerleave', lepas);
    };
  }, []);

  return <canvas ref={kanvas} className="partikel" aria-hidden="true" />;
}
