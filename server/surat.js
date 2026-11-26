// Pembuat PDF surat (FR-05, FR-08), dibuat 1:1 dengan acuan prodi di docs/template:
//   surat rekomendasi = Surat Rekomendasi/GUIDE PENGISIAN SURAT REKOM.docx (contoh: Surat Rekom Magang BPJS Zaki Faeyza Hakim.docx)
//   surat konversi    = Surat Konversi/GUIDE PENGISIAN SURAT KONVERSI.pdf (contoh: Surat Konversi - Tania Suci Prabaningrum.pdf)
// Teks surat ada di server/templates/*.txt (NFR-06). Posisi, ukuran, warna, dan jarak baris (satuan pt, kertas A4) diukur dari berkas acuan.
// Helvetica menggantikan Arial: lebar hurufnya identik, jadi pemenggalan baris sama dengan Word.
//
// Format templat: blok dipisah baris kosong. Baris pertama blok boleh berupa arahan:
//   @profil nama              rekomendasi | konversi (blok pertama)
//   @kop                      kop surat: baris 1 judul, baris 2 SK, sisanya paragraf program studi (**tebal**)
//   @judul                    tiap baris judul tebal rata tengah
//   @jarak n                  spasi tambahan n pt
//   @baris xLabel xTitik xIsi baris "Label : isi" dengan posisi kolom (pt dari tepi kiri kertas)
//   @daftar jarak             butir "1." / "a." (2 spasi = satu tingkat lebih dalam), jarak antarbutir n pt
//   @dua-kolom xKiri xKanan   baris "kiri | kanan"
//   @blok x [kanan]           tiap baris mulai x sampai margin kanan, rata kiri (atau kanan)
//   @ttd x tinggi             ruang tanda tangan setinggi `tinggi` berisi gambar TTD, lalu nama rata kanan dari x
//   @tabel-matkul             tabel lampiran mata kuliah (surat konversi)
//   @halaman                  halaman baru
//   (tanpa arahan)            tiap baris satu paragraf rata kiri-kanan; **tebal** dan *miring* didukung
import fs from 'node:fs/promises';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';

export const DIR_TEMPLAT = fileURLToPath(new URL('./templates/', import.meta.url));
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SATUAN = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

const zona = { timeZone: 'Asia/Jakarta' };
export const tanggalPanjangId = (d) => new Date(d).toLocaleDateString('id-ID', { ...zona, day: 'numeric', month: 'long', year: 'numeric' });
export const tanggalAngkaId = (d) => new Date(d).toLocaleDateString('en-GB', { ...zona, day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', '-');
export const bulanTahunId = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const bagian = (d) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { ...zona, year: 'numeric', month: 'numeric' }).formatToParts(new Date(d)).map((p) => [p.type, p.value]));

// 5 → "5 (lima)", dipakai untuk bulan dan SKS pada surat resmi. Cukup sampai 99.
export function angkaTerbilang(n) {
  const t = (x) => (x < 12 ? SATUAN[x] : x < 20 ? `${t(x - 10)} belas` : `${SATUAN[Math.floor(x / 10)]} puluh${x % 10 ? ` ${SATUAN[x % 10]}` : ''}`);
  return `${n} (${t(n)})`;
}

// Lama magang dibulatkan ke bulan terdekat (minimal 1).
export const lamaBulan = (mulai, selesai) => Math.max(1, Math.round(((Date.parse(selesai) - Date.parse(mulai)) / 86_400_000 + 1) / 30));

// Nomor otomatis NNN/KODE/SI-UG/BLN/TTTT, urut per jenis per tahun (SDD tabel 17). Dipakai bila admin tidak mengisi nomor sendiri.
export async function nomorSuratBerikut(c, jenis, kode, sekarang = new Date()) {
  const { year, month } = bagian(sekarang);
  const { rows } = await c.query('SELECT count(*)::int AS n FROM surat WHERE jenis_surat = $1 AND nomor_surat LIKE $2', [jenis, `%/${year}`]);
  return `${String(rows[0].n + 1).padStart(3, '0')}/${kode}/SI-UG/${ROMAWI[Number(month) - 1]}/${year}`;
}

const isi = (teks, data) => teks.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
const FONT = { biasa: 'Helvetica', tebal: 'Helvetica-Bold', miring: 'Helvetica-Oblique', tebalMiring: 'Helvetica-BoldOblique' };
const NAIK = 0.718; // tinggi huruf di atas garis dasar per pt (ascender Helvetica): posisi atas baris = garis dasar - NAIK × ukuran
const UNGU_REK = '#57257d';
const UNGU_KNV = '#68237c';

const PROFIL = {
  // Word: Arial 12 pt spasi tunggal (13,8 pt). Margin kiri 3 cm, kanan & bawah 2,5 cm; baris pertama tiap halaman di garis dasar 181,3 pt.
  rekomendasi: { margin: { top: 181.3 - NAIK * 12, bottom: 70.9, left: 85.1, right: 70.9 }, ukuran: 12, jarak: 13.8, logo: 'logo-rekomendasi.jpg', kop: kopRekomendasi, kopTiapHalaman: false },
  // PDF acuan: Arial 10 pt, jarak baris 12 pt, margin kiri 72 pt, kanan 71,7 pt; kop diulang di tiap halaman, baris pertama di garis dasar 171,6 pt.
  konversi: { margin: { top: 171.6 - NAIK * 10, bottom: 72, left: 72, right: 71.7 }, ukuran: 10, jarak: 12, logo: 'logo-konversi.jpg', kop: kopKonversi, kopTiapHalaman: true },
};

// "a **b** *c*" → [{ t, gaya }]. Markah dibaca dari templat sebelum isian dimasukkan, jadi tanda * di data tidak mengubah gaya.
function potong(teks) {
  return teks.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean)
    .map((t) => (t.startsWith('**') ? { t: t.slice(2, -2), gaya: 'tebal' } : t.length > 1 && t.startsWith('*') ? { t: t.slice(1, -1), gaya: 'miring' } : { t, gaya: 'biasa' }));
}

function tulisDi(doc, teks, x, garisDasar, { font = FONT.biasa, ukuran, warna = '#000', skala = 100 }) {
  doc.font(font).fontSize(ukuran).fillColor(warna).text(teks, x, garisDasar - NAIK * ukuran, { lineBreak: false, horizontalScaling: skala });
}

// Penyusun baris sendiri, bukan pemenggal pdfkit: seperti Word, baris hanya dipenggal di spasi (bukan di "/"), spasi di batas gaya
// tidak hilang, dan baris yang pas sampai tepi kanan tidak dipenggal lebih awal. Tiap potongan diukur dengan fontnya sendiri.
function susunBaris(doc, runs, lebar, ukuran) {
  const kata = [];
  let kini = null;
  let spasi = 0;
  for (const r of runs) {
    doc.font(FONT[r.gaya]).fontSize(ukuran);
    for (const bag of r.t.split(/( +)/)) {
      if (!bag) continue;
      if (bag[0] === ' ') {
        spasi += doc.widthOfString(bag);
        kini = null;
        continue;
      }
      const w = doc.widthOfString(bag);
      if (!kini) {
        kini = { potongan: [], w: 0, spasi };
        kata.push(kini);
        spasi = 0;
      }
      kini.potongan.push({ ...r, t: bag, w });
      kini.w += w;
    }
  }
  const baris = [];
  for (const k of kata) {
    const b = baris.at(-1);
    // Seperti acuan, spasi boleh dirapatkan sedikit (≤ 1% lebar baris) agar kata terakhir tetap muat.
    if (b && b.w + k.spasi + k.w <= lebar * 1.01) {
      b.kata.push(k);
      b.w += k.spasi + k.w;
      b.celah += k.spasi;
    } else baris.push({ kata: [k], w: k.w, celah: 0 });
  }
  return baris.length ? baris : [{ kata: [], w: 0, celah: 0 }];
}

// Satu paragraf (boleh campuran gaya) dengan jarak baris tetap `jarak`. Rata kiri-kanan meregangkan spasi, kecuali baris terakhir.
function paragraf(doc, runs, x, lebar, { ukuran, jarak, align = 'justify', warna = '#000', y = doc.y, pindahHalaman = true }) {
  const baris = susunBaris(doc, runs, lebar, ukuran);
  let yb = y;
  baris.forEach((b, i) => {
    if (pindahHalaman && yb > doc.page.margins.top && yb + jarak > doc.page.height - doc.page.margins.bottom + 0.01) {
      doc.addPage();
      yb = doc.y;
    }
    const regang = align === 'justify' && i < baris.length - 1 && b.celah > 0 ? (lebar - b.w) / b.celah : 0;
    let px = x + (align === 'right' ? lebar - b.w : align === 'center' ? (lebar - b.w) / 2 : 0);
    b.kata.forEach((k, j) => {
      if (j) px += k.spasi * (1 + regang);
      for (const p of k.potongan) {
        doc.font(FONT[p.gaya]).fontSize(ukuran).fillColor(p.warna ?? warna).text(p.t, px, yb, { lineBreak: false });
        px += p.w;
      }
    });
    yb += jarak;
  });
  doc.fillColor('#000');
  doc.x = x;
  doc.y = yb;
}

const jumlahBaris = (doc, teks, lebar, P) => susunBaris(doc, [{ t: teks, gaya: 'biasa' }], lebar, P.ukuran).length;

// Seperti Word: paragraf tidak meninggalkan satu baris sendirian di dasar halaman. Surat konversi berkop di tiap halaman, jadi paragrafnya tidak dipotong.
// shortcut: baris terakhir paragraf tetap boleh jatuh sendirian di halaman berikutnya (Word akan menarik satu baris lagi); cukup untuk surat 1–2 halaman.
function cukup(doc, P, n) {
  const sisa = Math.floor((doc.page.height - doc.page.margins.bottom - doc.y) / P.jarak + 1e-6);
  if (n > sisa && (P.kopTiapHalaman || sisa < 2)) doc.addPage();
}

// Kop surat rekomendasi (header halaman pertama di DOCX): logo, judul ungu tebal miring bergaris bawah, SK, tiga paragraf program studi.
function kopRekomendasi(doc, [judul, sk, ...prodi], logo) {
  if (logo) doc.image(logo, 70.2, 26.8, { width: 61.4, height: 61.2 });
  tulisDi(doc, judul, 145.1, 56.6, { font: FONT.tebalMiring, ukuran: 22, warna: UNGU_REK });
  doc.rect(145.1, 58.9, 379.4, 2.3).fill(UNGU_REK);
  // Di acuan baris SK memakai Calibri Bold 10 pt (lebar 113,2 pt); Helvetica Bold dipadatkan ke lebar yang sama.
  doc.font(FONT.tebal).fontSize(10);
  tulisDi(doc, sk, 176.7, 73.0, { font: FONT.tebal, ukuran: 10, skala: (113.2 / doc.widthOfString(sk)) * 100 });
  const warnaLabel = ['#6f2f9f', UNGU_REK, UNGU_REK, UNGU_REK]; // label D3 di acuan sedikit lebih terang
  let k = 0;
  let y = 82.8 - NAIK * 7;
  for (const p of prodi) {
    const runs = potong(p).map((r) => (r.gaya === 'tebal' ? { ...r, warna: warnaLabel[k++] ?? UNGU_REK } : r));
    paragraf(doc, runs, 170.9, 334.6, { ukuran: 7, jarak: 7.8, y });
    y = doc.y + 0.6;
  }
}

// Kop surat konversi: logo, judul ungu tebal rata kiri, SK hitam, empat paragraf program studi ungu, garis hitam tebal.
function kopKonversi(doc, [judul, sk, ...prodi], logo) {
  if (logo) doc.image(logo, 76.0, 37.0, { width: 61.5, height: 63.8 });
  tulisDi(doc, judul, 151.1, 52.8, { font: FONT.tebal, ukuran: 17, warna: UNGU_KNV });
  tulisDi(doc, sk, 151.1, 65.6, { font: FONT.tebal, ukuran: 9 });
  let y = 74.4 - NAIK * 8.6;
  for (const p of prodi) {
    paragraf(doc, potong(p), 151.1, 364, { ukuran: 8.6, jarak: 8.15, align: 'left', warna: UNGU_KNV, y });
    y = doc.y;
  }
  doc.rect(70.6, 155.0, 454.4, 1.4).fill('#000');
}

// Lampiran surat konversi: NO | MATA KULIAH (KODE, NAMA) | SKS | SEM | KETERANGAN. Tepi kolom, tinggi baris, dan perataan dari PDF acuan.
const KOLOM = [72.0, 100.0, 155.1, 295.1, 325.1, 355.1, 523.6];
function tabelMatkul(doc, matkul) {
  const K = KOLOM;
  const garis = 0.4;
  const tegak = (x, y1, y2) => doc.rect(x, y1, garis, y2 - y1 + garis).fill('#000');
  const datar = (y, x1, x2) => doc.rect(x1, y, x2 - x1 + garis, garis).fill('#000');
  // Teks di tengah sel secara vertikal: garis dasar baris pertama = tengah sel - (n-1)/2 × jarak + 0,35 × ukuran.
  const sel = (teks, x1, x2, yTengah, { tebal = false, ukuran = 10, jarak = 11.5, rata = 'center' } = {}) => {
    const t = String(teks ?? '');
    if (!t) return;
    const pad = rata === 'center' ? 0 : 4.2;
    const runs = [{ t, gaya: tebal ? 'tebal' : 'biasa' }];
    const n = susunBaris(doc, runs, x2 - x1 - pad * 2, ukuran).length;
    const y = yTengah - ((n - 1) * jarak) / 2 + 0.35 * ukuran - NAIK * ukuran;
    paragraf(doc, runs, x1 + pad, x2 - x1 - pad * 2, { ukuran, jarak, align: rata, y, pindahHalaman: false });
  };
  const baris = (teks, lebar, ukuran) => susunBaris(doc, [{ t: String(teks ?? ' '), gaya: 'biasa' }], lebar, ukuran).length;
  const batas = () => doc.page.height - doc.page.margins.bottom;

  const kepala = () => {
    const y = doc.y;
    const h1 = 15.6;
    const h = 31.0;
    datar(y, K[0], K[6]);
    datar(y + h1, K[1], K[3]);
    datar(y + h, K[0], K[6]);
    for (const x of [K[0], K[1], K[3], K[4], K[5], K[6]]) tegak(x, y, y + h);
    tegak(K[2], y + h1, y + h);
    const b = { tebal: true };
    sel('NO', K[0], K[1], y + h / 2, b);
    sel('MATA KULIAH', K[1], K[3], y + h1 / 2, b);
    sel('KODE', K[1], K[2], y + h1 + (h - h1) / 2, b);
    sel('NAMA', K[2], K[3], y + h1 + (h - h1) / 2, b);
    sel('SKS', K[3], K[4], y + h / 2, b);
    sel('SEM', K[4], K[5], y + h / 2, b);
    sel('KETERANGAN', K[5], K[6], y + h / 2, b);
    doc.y = y + h;
  };

  kepala();
  matkul.forEach((m, i) => {
    const h = Math.max(
      baris(m.keterangan, K[6] - K[5] - 8.4, 8.6) * 8.53,
      baris(m.nama_mk, K[3] - K[2] - 8.4, 10) * 11.5,
      baris(m.kode_mk, K[2] - K[1] - 8.4, 10) * 11.5,
    ) + 3.9;
    if (doc.y + h > batas()) {
      doc.addPage();
      kepala();
    }
    const y = doc.y;
    for (const x of K) tegak(x, y, y + h);
    datar(y + h, K[0], K[6]);
    const t = y + h / 2;
    sel(i + 1, K[0], K[1], t);
    sel(m.kode_mk, K[1], K[2], t, { rata: 'left' });
    sel(m.nama_mk, K[2], K[3], t, { rata: 'left' });
    sel(m.sks_diakui, K[3], K[4], t);
    sel(m.semester, K[4], K[5], t);
    sel(m.keterangan, K[5], K[6], t, { ukuran: 8.6, jarak: 8.53, rata: 'left' });
    doc.y = y + h;
  });
  // Baris jumlah: NO + KODE + NAMA digabung bertuliskan JUMLAH SKS; SEM dan KETERANGAN kosong.
  const h = 15.6;
  if (doc.y + h > batas()) doc.addPage();
  const y = doc.y;
  for (const x of [K[0], K[3], K[4], K[5], K[6]]) tegak(x, y, y + h);
  datar(y + h, K[0], K[6]);
  sel('JUMLAH SKS', K[0], K[3], y + h / 2, { tebal: true });
  sel(matkul.reduce((n, m) => n + m.sks_diakui, 0), K[3], K[4], y + h / 2, { tebal: true });
  doc.x = doc.page.margins.left;
  doc.y = y + h;
}

// data.ttd_gambar: PNG/JPG tanda tangan untuk @ttd; bila kosong dipakai ttd-kaprodi.png.
// matkul: [{ kode_mk, nama_mk, sks_diakui, semester, keterangan }] untuk @tabel-matkul.
export async function buatSuratPdf(berkasTemplat, data, matkul = []) {
  const templat = await fs.readFile(`${DIR_TEMPLAT}${berkasTemplat}`, 'utf8');
  const blok = templat.split(/\r?\n[ \t]*\r?\n/).map((b) => b.replace(/^\s+|\s+$/g, '').split(/\r?\n/)).filter((b) => b[0]);
  const [, namaProfil] = (blok.shift()?.[0] ?? '').trim().split(/\s+/);
  const P = PROFIL[namaProfil];
  if (!P) throw new Error(`Templat ${berkasTemplat} harus diawali "@profil rekomendasi" atau "@profil konversi".`);
  const logo = await fs.readFile(`${DIR_TEMPLAT}${P.logo}`).catch(() => null);
  // shortcut: ttd-kaprodi.png masih contoh (TTD Arya_Contoh); ganti berkasnya dengan TTD Ketua Prodi asli, atau admin mengunggah TTD saat menerbitkan.
  const ttd = data.ttd_gambar ?? (await fs.readFile(`${DIR_TEMPLAT}ttd-kaprodi.png`).catch(() => null));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: P.margin, info: { Title: data.nomor_surat ?? 'Surat' } });
    const potongan = [];
    doc.on('data', (b) => potongan.push(b));
    doc.on('end', () => resolve(Buffer.concat(potongan)));
    doc.on('error', reject);
    const kiri = P.margin.left;
    const kanan = doc.page.width - P.margin.right;
    const ukuran = { ukuran: P.ukuran, jarak: P.jarak };
    const runsDari = (l) => potong(l).map((r) => ({ ...r, t: isi(r.t, data) }));
    const polos = (runs) => runs.map((r) => r.t).join('');
    let kop = null;
    doc.on('pageAdded', () => {
      if (kop && P.kopTiapHalaman) P.kop(doc, kop, logo);
      doc.font(FONT.biasa).fontSize(P.ukuran).fillColor('#000');
      doc.x = kiri;
      doc.y = doc.page.margins.top;
    });

    try {
      for (const baris of blok) {
        const [arahan, ...arg] = baris[0].startsWith('@') ? baris.shift().trim().split(/\s+/) : [null];
        const n = arg.map(Number);
        if (arahan === '@kop') {
          kop = baris.map((l) => isi(l, data));
          P.kop(doc, kop, logo);
          doc.x = kiri;
          doc.y = doc.page.margins.top;
        } else if (arahan === '@halaman') {
          doc.addPage();
        } else if (arahan === '@jarak') {
          doc.y += n[0];
        } else if (arahan === '@judul') {
          for (const l of baris) paragraf(doc, [{ t: isi(l, data), gaya: 'tebal' }], kiri, kanan - kiri, { ...ukuran, align: 'center' });
        } else if (arahan === '@baris') {
          // "Label : isi": label dan titik dua satu baris; isi boleh membungkus, sejajar di kolom isi.
          const [xLabel, xTitik, xIsi] = n;
          for (const l of baris) {
            const i = l.indexOf(':');
            const runs = runsDari(l.slice(i + 1).trim());
            cukup(doc, P, jumlahBaris(doc, polos(runs), kanan - xIsi, P));
            const y = doc.y;
            tulisDi(doc, isi(l.slice(0, i).trimEnd(), data), xLabel, y + NAIK * P.ukuran, { ukuran: P.ukuran });
            tulisDi(doc, ':', xTitik, y + NAIK * P.ukuran, { ukuran: P.ukuran });
            paragraf(doc, runs, xIsi, kanan - xIsi, { ...ukuran, y });
            doc.y = Math.max(doc.y, y + P.jarak);
          }
        } else if (arahan === '@daftar') {
          baris.forEach((l, j) => {
            const [, spasi, tanda, teks] = l.match(/^(\s*)(\S+)\s+(.*)$/);
            const xTanda = kiri + Math.floor(spasi.length / 2) * 18;
            const runs = runsDari(teks);
            cukup(doc, P, jumlahBaris(doc, polos(runs), kanan - xTanda - 18, P));
            const y = doc.y;
            tulisDi(doc, tanda, xTanda, y + NAIK * P.ukuran, { ukuran: P.ukuran });
            paragraf(doc, runs, xTanda + 18, kanan - xTanda - 18, { ...ukuran, y });
            if (j < baris.length - 1) doc.y += n[0] || 0;
          });
        } else if (arahan === '@dua-kolom') {
          const [xKiri, xKanan] = n;
          cukup(doc, P, baris.length);
          for (const l of baris) {
            const [ki, ka = ''] = l.split('|').map((s) => s.trim());
            const y = doc.y;
            let bawah = y + P.jarak;
            if (ki) { paragraf(doc, runsDari(ki), xKiri, xKanan - xKiri - 6, { ...ukuran, align: 'left', y }); bawah = Math.max(bawah, doc.y); }
            if (ka) { paragraf(doc, runsDari(ka), xKanan, kanan - xKanan, { ...ukuran, align: 'left', y }); bawah = Math.max(bawah, doc.y); }
            doc.y = bawah;
          }
        } else if (arahan === '@blok') {
          for (const l of baris) {
            const runs = runsDari(l);
            cukup(doc, P, jumlahBaris(doc, polos(runs), kanan - n[0], P));
            paragraf(doc, runs, n[0], kanan - n[0], { ...ukuran, align: arg[1] === 'kanan' ? 'right' : 'left' });
          }
        } else if (arahan === '@ttd') {
          // Ruang kosong setinggi baris-baris kosong di acuan; gambar TTD di tengah, tepat di atas nama yang rata kanan.
          const [x, tinggi] = n;
          const nama = baris.map((l) => isi(l, data));
          cukup(doc, P, Math.ceil(tinggi / P.jarak) + nama.length);
          const y = doc.y;
          if (ttd) {
            doc.font(FONT.biasa).fontSize(P.ukuran);
            const tengah = kanan - Math.min(kanan - x, Math.max(...nama.map((t) => doc.widthOfString(t)))) / 2;
            doc.image(ttd, tengah - 70, y + 2, { fit: [140, tinggi - 4], align: 'center', valign: 'center' });
          }
          doc.y = y + tinggi;
          for (const t of nama) paragraf(doc, [{ t, gaya: 'biasa' }], x, kanan - x, { ...ukuran, align: 'right' });
        } else if (arahan === '@tabel-matkul') {
          tabelMatkul(doc, matkul);
        } else {
          for (const l of baris) {
            const runs = runsDari(l);
            cukup(doc, P, jumlahBaris(doc, polos(runs), kanan - kiri, P));
            paragraf(doc, runs, kiri, kanan - kiri, ukuran);
          }
        }
      }
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
