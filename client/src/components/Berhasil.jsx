import { Link } from 'react-router-dom';

// Dialog konfirmasi setelah pengajuan terkirim. aksi: [{ to, label, utama? }]
export default function Berhasil({ judul, aksi }) {
  return (
    <div className="modal-latar">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="judul-berhasil">
        <span className="modal-ikon">✓</span>
        <h2 id="judul-berhasil">{judul}</h2>
        <div className="modal-aksi">
          {aksi.map((a) => <Link key={a.to} className={`btn ${a.utama ? 'isi' : 'garis'}`} to={a.to}>{a.label}</Link>)}
        </div>
      </div>
    </div>
  );
}
