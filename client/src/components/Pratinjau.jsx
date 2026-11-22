import { useEffect, useState } from 'react';
import { ambilBlobUrl, unduhBerkas } from '../api';
import { tanggalAngka } from '../format';

// Daftar dokumen PDF dengan tombol Preview (tampil di panel di bawahnya) dan Unduh.
// berkas: [{ kunci, label, nama, path, pada? }]; berkas tanpa path dianggap belum diunggah; `pada` (opsional) menambah kolom Tanggal Unggah.
export default function DaftarPratinjau({ berkas, judulPanel = 'Preview' }) {
  const [terpilih, setTerpilih] = useState(null);
  const [url, setUrl] = useState(null);
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    setUrl(null);
    setGalat(null);
    if (!terpilih) return undefined;
    let batal = false;
    let objek = null;
    ambilBlobUrl(terpilih.path).then((u) => { if (batal) URL.revokeObjectURL(u); else { objek = u; setUrl(u); } }, (e) => !batal && setGalat(e.message));
    return () => { batal = true; if (objek) URL.revokeObjectURL(objek); };
  }, [terpilih?.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const adaTgl = berkas.some((b) => b.pada);
  return (
    <>
      <div className="tabel-wrap">
        <table className="tabel-dok">
          <thead><tr><th>Dokumen</th><th>Format</th>{adaTgl && <th>Tanggal Unggah</th>}<th><span className="sr">Aksi</span></th></tr></thead>
          <tbody>
            {berkas.map((b) => (
              <tr key={b.kunci}>
                <td>{b.label}{b.nama && <small>{b.nama}</small>}</td>
                <td>PDF</td>
                {adaTgl && <td>{b.pada ? tanggalAngka(b.pada) : '–'}</td>}
                <td className="td-aksi">
                  {b.path ? (
                    <>
                      <button type="button" className="btn garis kecil" onClick={() => setTerpilih(b)}>Preview</button>
                      <button type="button" className="btn garis kecil" onClick={() => unduhBerkas(b.path, b.nama ?? `${b.kunci}.pdf`).catch((e) => setGalat(e.message))}>Unduh</button>
                    </>
                  ) : <span className="badge abu">Belum diunggah</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {galat && <p className="pesan galat" role="alert" style={{ marginTop: 10 }}>{galat}</p>}
      {terpilih && (
        <div className="panel-pratinjau">
          <p className="panel-judul">{judulPanel}: {terpilih.label}</p>
          {url ? <iframe title={`Pratinjau ${terpilih.label}`} src={url} /> : !galat && <p className="kosong">Memuat pratinjau…</p>}
        </div>
      )}
    </>
  );
}
