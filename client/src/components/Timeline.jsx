import { tanggalAngka } from '../format';
import Badge from './Badge.jsx';

// langkah: [{ judul, kunci }]; `sudah` = jumlah langkah selesai; riwayat: [{ status, pada }] dari server.
export default function Timeline({ langkah, sudah, riwayat = [], ditolak = false, alasan }) {
  return (
    <ol className="timeline">
      {langkah.map(({ judul, kunci }, i) => {
        const kondisi = i < sudah ? 'selesai' : i === sudah && ditolak ? 'ditolak' : i === sudah && sudah > 0 ? 'berjalan' : 'belum';
        const pada = riwayat.find((r) => r.status === kunci)?.pada;
        const sub = { selesai: pada ? tanggalAngka(pada) : 'Selesai', berjalan: 'Sedang diproses', belum: 'Belum dimulai', ditolak: alasan ?? 'Ditolak' }[kondisi];
        return (
          <li key={judul} className={kondisi}>
            <span className="bulat">{kondisi === 'selesai' ? '✓' : kondisi === 'ditolak' ? '✕' : i + 1}</span>
            <div>
              <p className="tl-judul">{judul}</p>
              <p className="tl-sub">{sub}</p>
            </div>
            {kondisi === 'selesai' && <Badge nilai="selesai" label="Selesai" />}
          </li>
        );
      })}
    </ol>
  );
}
