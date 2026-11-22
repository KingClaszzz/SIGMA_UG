import { useRef, useState } from 'react';
import { ukuranBerkas } from '../format';
import TautanBerkas from './Berkas.jsx';

const MAKS = 2 * 1024 * 1024;

// Area unggah satu PDF (maks. 2 MB). onPilih(file) harus melempar galat bila server menolak.
export default function Upload({ berkas, tautan, onPilih, onHapus, terkunci = false }) {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState(null);
  const [seret, setSeret] = useState(false);
  const input = useRef(null);

  async function pilih(file) {
    if (!file) return;
    setGalat(null);
    if (file.type !== 'application/pdf' || file.size > MAKS) return setGalat('Berkas harus PDF dengan ukuran maksimal 2 MB.');
    setSibuk(true);
    try {
      await onPilih(file);
    } catch (e) {
      setGalat(e.message);
    } finally {
      setSibuk(false);
      if (input.current) input.current.value = '';
    }
  }

  const masukan = <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => pilih(e.target.files[0])} />;

  return (
    <>
      {berkas ? (
        <div className="berkas">
          <span className="berkas-ikon" aria-hidden="true">▤</span>
          <div className="berkas-isi">
            <p className="berkas-nama">{berkas.nama} <small>{ukuranBerkas(berkas.ukuran)}</small></p>
            <span className="bar"><span /></span>
          </div>
          <span className="badge hijau">Terunggah</span>
          {tautan && <TautanBerkas className="aksi-kecil" path={tautan}>Lihat</TautanBerkas>}
          {!terkunci && <button type="button" className="aksi-kecil" disabled={sibuk} onClick={() => input.current.click()}>{sibuk ? 'Mengunggah…' : 'Ganti'}</button>}
          {!terkunci && onHapus && <button type="button" className="hapus" aria-label="Hapus berkas" disabled={sibuk} onClick={onHapus}>✕</button>}
          {masukan}
        </div>
      ) : (
        <div
          className={`dropzone${seret ? ' seret' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setSeret(true); }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => { e.preventDefault(); setSeret(false); pilih(e.dataTransfer.files[0]); }}
        >
          <span aria-hidden="true">⇪</span>
          <p>{sibuk ? 'Mengunggah…' : 'Tarik & lepas atau klik — PDF maks. 2 MB'}</p>
          <button type="button" className="btn garis kecil" disabled={sibuk || terkunci} onClick={() => input.current.click()}>Pilih File</button>
          {masukan}
        </div>
      )}
      {galat && <p className="pesan galat" role="alert">{galat}</p>}
    </>
  );
}
