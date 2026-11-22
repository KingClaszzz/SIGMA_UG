// "Riwayat Perubahan Status" pada detail pengajuan admin: item = [{ judul, pada, oleh }], urut dari yang lama.
import { tanggalAngka } from '../format';

export default function RiwayatStatus({ item }) {
  return (
    <ol className="riwayat-status">
      {item.map((x, i) => (
        <li key={i}>
          <strong>{x.judul}</strong>
          <span>{x.pada ? tanggalAngka(x.pada) : '–'}{x.oleh ? ` · ${x.oleh}` : ''}</span>
        </li>
      ))}
    </ol>
  );
}
