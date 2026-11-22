import { useState } from 'react';
import { bukaBerkas } from '../api';

// Tombol yang membuka PDF dari API (butuh token). Menggantikan <a href="/api/...">.
export default function TautanBerkas({ path, className, style, children }) {
  const [gagal, setGagal] = useState(null);
  async function buka() {
    setGagal(null);
    try {
      await bukaBerkas(path);
    } catch (e) {
      setGagal(e.message);
    }
  }
  return (
    <>
      <button type="button" className={className} style={style} onClick={buka}>{children}</button>
      {gagal && <span className="pesan galat" role="alert">{gagal}</span>}
    </>
  );
}
