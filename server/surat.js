// Pembuat PDF surat (FR-05, FR-08) mengikuti templat prodi di docs/template. Teks surat ada di server/templates/*.txt (dipisah dari kode, NFR-06):
// prodi cukup mengubah berkas templat. Isian memakai {{nama_isian}} dan diambil dari data aktual (mahasiswa, pengajuan, input admin).
//
// Format templat: blok dipisah baris kosong; baris kosong di dalam blok ditulis "~". Baris pertama blok boleh berupa arahan:
//   @kop           kop surat Universitas Gunadarma (logo + baris 1 judul, baris 2 SK, sisanya paragraf kecil; **tebal** didukung); diulang di tiap halaman
//   @judul         judul tengah, tebal
//   @baris         baris "Label : isi" sejajar, atau teks rata kiri
//   @daftar        butir bernomor "1." / "a." dengan indentasi (2 spasi per tingkat)
//   @dua-kolom     tiap baris "kiri | kanan" (tanda tangan dua pihak)
//   @kanan         rata kanan
//   @tengah        blok rata kanan-tengah (tanda tangan tunggal)
//   @tabel-matkul  tabel lampiran mata kuliah (hanya surat konversi)
//   @halaman       halaman baru
//   (tanpa arahan) paragraf rata kiri-kanan
// shortcut: tanda tangan/barcode belum ada (menunggu keputusan pimpinan prodi, SRS NOT-02); surat dicetak dan ditandatangani basah.
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

// NNN/KODE/SI-UG/BLN/TTTT, nomor urut per jenis per tahun (SDD tabel 17). Indeks unik di basis data menjaga agar tidak kembar.
export async function nomorSuratBerikut(c, jenis, kode, sekarang = new Date()) {
  const { year, month } = bagian(sekarang);
  const { rows } = await c.query('SELECT count(*)::int AS n FROM surat WHERE jenis_surat = $1 AND nomor_surat LIKE $2', [jenis, `%/${year}`]);
  return `${String(rows[0].n + 1).padStart(3, '0')}/${kode}/SI-UG/${ROMAWI[Number(month) - 1]}/${year}`;
}

const isi = (teks, data) => teks.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
const FONT = 10.5;
const MARGIN = { top: 40, bottom: 60, left: 85, right: 71 };

// Kop: logo di kiri, judul di tengah, lalu paragraf program studi. Mengembalikan posisi y di bawah kop.
function gambarKop(doc, baris, logo) {
  const x0 = MARGIN.left;
  const lebar = doc.page.width - MARGIN.left - MARGIN.right;
  const [judul, sk, ...kecil] = baris;
  if (logo) doc.image(logo, x0, 36, { width: 62 });
  doc.font('Helvetica-Bold').fontSize(20).text(judul, x0 + 70, 42, { width: lebar - 70, align: 'center', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(11).text(sk, x0 + 70, 68, { width: lebar - 70, align: 'center', lineBreak: false });
  doc.y = 106;
  for (const p of kecil) {
    const potong = p.split('**').map((t, i) => [t, i % 2]).filter(([t]) => t);
    potong.forEach(([t, tebal], i) => {
      doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).text(t, ...(i === 0 ? [x0, doc.y] : []), { width: lebar, align: 'justify', continued: i < potong.length - 1 });
    });
  }
  doc.moveTo(x0, doc.y + 4).lineTo(x0 + lebar, doc.y + 4).lineWidth(1.2).stroke();
  return doc.y + 18;
}

function sel(doc, x, y, w, h, teks, { tebal = false, rata = 'left' } = {}) {
  doc.rect(x, y, w, h).lineWidth(0.7).stroke();
  if (teks !== '') doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).text(String(teks), x + 4, y + 4, { width: w - 8, align: rata });
}

// Lampiran: No | Mata Kuliah (Kode, Nama) | SKS | Sem | Keterangan. Isi baris hanya dari input admin.
function tabelMatkul(doc, matkul) {
  const lebar = [28, 68, 130, 30, 30];
  lebar.push(doc.page.width - MARGIN.left - MARGIN.right - lebar.reduce((a, b) => a + b, 0));
  const x0 = MARGIN.left;
  const geser = (i) => x0 + lebar.slice(0, i).reduce((a, b) => a + b, 0);
  const awalHalaman = () => {
    const y = doc.y;
    sel(doc, geser(0), y, lebar[0], 40, 'NO', { tebal: true, rata: 'center' });
    sel(doc, geser(1), y, lebar[1] + lebar[2], 20, 'MATA KULIAH', { tebal: true, rata: 'center' });
    sel(doc, geser(1), y + 20, lebar[1], 20, 'KODE', { tebal: true, rata: 'center' });
    sel(doc, geser(2), y + 20, lebar[2], 20, 'NAMA', { tebal: true, rata: 'center' });
    sel(doc, geser(3), y, lebar[3], 40, 'SKS', { tebal: true, rata: 'center' });
    sel(doc, geser(4), y, lebar[4], 40, 'SEM', { tebal: true, rata: 'center' });
    sel(doc, geser(5), y, lebar[5], 40, 'KETERANGAN', { tebal: true, rata: 'center' });
    doc.y = y + 40;
  };
  awalHalaman();
  matkul.forEach((m, i) => {
    const nilai = [i + 1, m.kode_mk, m.nama_mk, m.sks_diakui, m.sem, m.keterangan];
    doc.font('Helvetica').fontSize(10);
    const h = Math.max(...nilai.map((t, j) => doc.heightOfString(String(t), { width: lebar[j] - 8 }))) + 10;
    if (doc.y + h > doc.page.height - MARGIN.bottom) { doc.addPage(); awalHalaman(); }
    const y = doc.y;
    nilai.forEach((t, j) => sel(doc, geser(j), y, lebar[j], h, t, { rata: j === 5 || j === 2 ? 'left' : 'center' }));
    doc.y = y + h;
  });
  const y = doc.y;
  sel(doc, geser(0), y, lebar[0] + lebar[1], 22, '');
  sel(doc, geser(2), y, lebar[2], 22, 'JUMLAH SKS', { tebal: true, rata: 'center' });
  sel(doc, geser(3), y, lebar[3], 22, matkul.reduce((t, m) => t + m.sks_diakui, 0), { tebal: true, rata: 'center' });
  sel(doc, geser(4), y, lebar[4] + lebar[5], 22, '');
  doc.x = x0;
  doc.y = y + 22 + 14;
}

export async function buatSuratPdf(berkasTemplat, data, matkul = []) {
  const templat = await fs.readFile(`${DIR_TEMPLAT}${berkasTemplat}`, 'utf8');
  const logo = await fs.readFile(`${DIR_TEMPLAT}logo-gunadarma.jpg`).catch(() => null);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: MARGIN, info: { Title: data.nomor_surat ?? 'Surat' } });
    const potongan = [];
    doc.on('data', (b) => potongan.push(b));
    doc.on('end', () => resolve(Buffer.concat(potongan)));
    doc.on('error', reject);
    const lebar = doc.page.width - MARGIN.left - MARGIN.right;
    const x0 = MARGIN.left;
    let kop = null;
    // Kop tampil di setiap halaman; teks mulai di bawahnya.
    doc.on('pageAdded', () => { if (kop) { doc.y = gambarKop(doc, kop, logo); doc.x = x0; } });

    for (const blok of templat.split(/\r?\n[ \t]*\r?\n/)) {
      const baris = blok.replace(/^\s+|\s+$/g, '').split(/\r?\n/);
      if (!baris[0]) continue;
      const arahan = baris[0].startsWith('@') ? baris.shift().trim() : null;
      const teks = isi(baris.join('\n'), data).replace(/^~$/gm, ' ');
      doc.font('Helvetica').fontSize(FONT);
      doc.x = x0;
      if (arahan === '@kop') {
        kop = isi(baris.join('\n'), data).split('\n');
        doc.y = gambarKop(doc, kop, logo);
      } else if (arahan === '@halaman') {
        doc.addPage();
      } else if (arahan === '@judul') {
        doc.font('Helvetica-Bold').fontSize(10).text(teks, x0, doc.y, { width: lebar, align: 'center' });
        doc.moveDown(0.6);
      } else if (arahan === '@tabel-matkul') {
        tabelMatkul(doc, matkul);
      } else if (arahan === '@baris') {
        // "Label : isi" dibuat dua kolom supaya titik dua sejajar.
        for (const l of teks.split('\n')) {
          const m = l.match(/^([^:]{1,24}?)\s*:\s(.*)$/);
          if (m) {
            const y = doc.y;
            doc.text(m[1], x0, y, { width: 100 });
            const kiri = doc.y;
            doc.text(`: ${m[2]}`, x0 + 100, y, { width: lebar - 100 });
            doc.y = Math.max(kiri, doc.y);
          } else doc.text(l, x0, doc.y, { width: lebar, align: 'left' });
        }
        doc.moveDown(0.6);
      } else if (arahan === '@daftar') {
        for (const l of teks.split('\n')) {
          const m = l.match(/^(\s*)(\d+\.|[a-z]\.)\s+(.*)$/);
          const indent = m ? m[1].length * 9 : 0;
          const y = doc.y;
          if (m) doc.text(m[2], x0 + indent, y, { width: 18 });
          doc.text(m ? m[3] : l.trim(), x0 + indent + 18, y, { width: lebar - indent - 18, align: 'justify' });
          doc.moveDown(0.25);
        }
        doc.moveDown(0.3);
      } else if (arahan === '@dua-kolom') {
        for (const l of teks.split('\n')) {
          const [kiri, kanan = ''] = l.split('|').map((s) => s.trim().replace(/^~$/, ''));
          const y = doc.y;
          doc.text(kiri, x0, y, { width: lebar / 2 - 10 });
          const bawah = doc.y;
          doc.text(kanan, x0 + lebar / 2, y, { width: lebar / 2 });
          doc.y = Math.max(bawah, doc.y);
        }
        doc.moveDown(1);
      } else if (arahan === '@kanan' || arahan === '@tengah') {
        doc.text(teks, x0 + (arahan === '@tengah' ? lebar / 2 : 0), doc.y, { width: arahan === '@tengah' ? lebar / 2 : lebar, align: arahan === '@tengah' ? 'center' : 'right' });
        doc.moveDown(1);
      } else {
        doc.text(teks, x0, doc.y, { width: lebar, align: 'justify', lineGap: 2 });
        doc.moveDown(0.6);
      }
    }
    doc.end();
  });
}
