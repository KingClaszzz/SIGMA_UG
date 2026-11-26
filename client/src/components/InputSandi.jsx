// Kolom kata sandi dengan ikon mata (tampil/sembunyikan). Props input diteruskan; label dibungkus oleh pemanggil.
import { useState } from 'react';

export default function InputSandi(props) {
  const [lihat, setLihat] = useState(false);
  return (
    <span className="sandi-bungkus">
      <input {...props} type={lihat ? 'text' : 'password'} />
      <button type="button" className="sandi-mata" aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setLihat(!lihat)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {lihat && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}
