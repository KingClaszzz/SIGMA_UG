// Tanda tangan digital laporan akhir (FR-15): membubuhkan blok pengesahan pada halaman terakhir PDF mahasiswa.
// shortcut: ini pengesahan internal sistem (nama, NIDN, waktu, dan sidik jari SHA-256 berkas asli), bukan tanda tangan elektronik tersertifikasi (BSrE/Tilaka). Ganti bila prodi mewajibkannya.
import crypto from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const tanggal = (d) => new Date(d).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export async function bubuhiTandaTangan(buffer, { nama, nidn, waktu = new Date() }) {
  const sidik = crypto.createHash('sha256').update(buffer).digest('hex');
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const halaman = pdf.getPages().at(-1);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const tebal = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width } = halaman.getSize();
  const lebar = 250;
  const x = width - lebar - 36;
  halaman.drawRectangle({ x, y: 30, width: lebar, height: 78, borderColor: rgb(0.35, 0.2, 0.55), borderWidth: 1, color: rgb(0.98, 0.97, 1) });
  const baris = [
    ['Disahkan secara digital oleh Dosen Pendamping', tebal, 8],
    [nama, tebal, 10],
    [`NIDN ${nidn}`, font, 8],
    [tanggal(waktu), font, 8],
    [`ID verifikasi: ${sidik.slice(0, 16)}`, font, 7],
  ];
  baris.forEach(([teks, f, ukuran], i) => halaman.drawText(teks, { x: x + 10, y: 94 - i * 14, size: ukuran, font: f, color: rgb(0.15, 0.1, 0.3), maxWidth: lebar - 20 }));
  return { buffer: Buffer.from(await pdf.save()), sidik };
}
