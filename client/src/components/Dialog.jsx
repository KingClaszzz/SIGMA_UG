// Dialog konfirmasi sederhana (desain admin: "Publikasikan Periode?", "Tolak Konversi", dst.). Tutup dengan Escape atau klik di luar kotak.
import { useEffect } from 'react';

export default function Dialog({ judul, children, onTutup, lebar = 460 }) {
  useEffect(() => {
    const tutup = (e) => e.key === 'Escape' && onTutup();
    document.addEventListener('keydown', tutup);
    return () => document.removeEventListener('keydown', tutup);
  }, [onTutup]);
  return (
    <div className="dialog-latar" onMouseDown={(e) => e.target === e.currentTarget && onTutup()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={judul} style={{ maxWidth: lebar }}>
        <h2>{judul}</h2>
        {children}
      </div>
    </div>
  );
}
