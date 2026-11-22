// Pembatas laju (anti-spam) di memori: maks `maks` kejadian per `jendelaMs` untuk satu kunci (IP atau pengguna).
// shortcut: hitungan hidup di memori satu proses dan hilang saat server restart; bila server dijalankan lebih dari satu salinan, pindahkan ke Redis.
export function pembatas({ jendelaMs, maks, kunci, pesan = 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', lewati = () => false }) {
  const catatan = new Map();
  setInterval(() => {
    const batas = Date.now() - jendelaMs;
    for (const [k, v] of catatan) if (v.at(-1) < batas) catatan.delete(k);
  }, Math.max(jendelaMs, 60_000)).unref();
  const bersih = (k) => {
    const v = (catatan.get(k) ?? []).filter((t) => t > Date.now() - jendelaMs);
    catatan.set(k, v);
    return v;
  };
  const tolak = (res, v) => res.set('Retry-After', String(Math.ceil((v[0] + jendelaMs - Date.now()) / 1000))).status(429).json({ error: pesan });
  const mw = (req, res, next) => {
    if (lewati(req)) return next();
    const k = kunci(req);
    const v = bersih(k);
    if (v.length >= maks) return tolak(res, v);
    v.push(Date.now());
    next();
  };
  // Untuk hitungan yang hanya bertambah pada kegagalan (mis. token salah): periksa dulu, catat bila gagal.
  mw.penuh = (k) => bersih(k).length >= maks;
  mw.catat = (k) => bersih(k).push(Date.now());
  mw.tolak = tolak;
  mw.isi = (k) => bersih(k);
  return mw;
}
