// Kerangka aplikasi bersama semua peran (sidebar + header). Tiap peran memberi menu dan identitasnya sendiri:
// mahasiswa/MahasiswaShell.jsx, admin/AdminShell.jsx, dosen/DosenShell.jsx.
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { icon, logo } from '../assets';
import { api } from '../api';
import { keluar, useKeluarOtomatis } from '../auth/sesi';
import Maskot from './Maskot.jsx';
import './shell.css';

function NavItem({ to, label, ikon, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' aktif' : ''}`}>
      <img src={icon(ikon)} alt="" width="20" height="20" />
      {label}
    </NavLink>
  );
}

// Menutup popup saat klik di luar atau menekan Escape.
export function useTutupLuar(open, setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const tutup = (e) => (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) && setOpen(false);
    document.addEventListener('mousedown', tutup);
    document.addEventListener('keydown', tutup);
    return () => {
      document.removeEventListener('mousedown', tutup);
      document.removeEventListener('keydown', tutup);
    };
  }, [open, setOpen]);
  return ref;
}

function UserMenu({ nama, sub, profil, avatar }) {
  const [open, setOpen] = useState(false);
  const ref = useTutupLuar(open, setOpen);
  const navigate = useNavigate();

  return (
    <div className="user" ref={ref}>
      <button className="user-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {avatar && <span className="avatar" aria-hidden="true">{avatar}</span>}
        <span className="user-teks">
          <strong>{nama}</strong>
          <span>{sub ?? ' '}</span>
        </span>
      </button>
      {open && (
        <div className="menu" role="menu">
          {profil && <Link to={profil} role="menuitem" onClick={() => setOpen(false)}>Profil Saya</Link>}
          <button role="menuitem" onClick={async () => { await keluar(); navigate('/'); }}>Keluar</button>
        </div>
      )}
    </div>
  );
}

// menu: [[alamat, label, ikon, end?]]; profil: alamat halaman profil (opsional, ikut tampil di sidebar bawah);
// maskot: pose maskot di ruang kosong sidebar ('jas' | 'laptop' | 'papan', opsional); avatar: inisial bulat di samping nama (opsional); lonceng: elemen notifikasi (opsional, mis. admin/Notifikasi.jsx).
export default function Kerangka({ menu, beranda, chip, nama, sub, profil, avatar, lonceng, maskot, children }) {
  useKeluarOtomatis(30); // NFR-02
  // Denyut: selama halaman terbuka, server tahu perangkat ini masih memegang akun (perangkat lain ditolak). Tutup tanpa keluar = akun bebas setelah 5 menit.
  useEffect(() => {
    const id = setInterval(() => api('/saya').catch(() => {}), 120_000);
    return () => clearInterval(id);
  }, []);
  const navigate = useNavigate();
  return (
    <div className="shell">
      <aside className="aside">
        <Link to={beranda} className="brand">
          <img src={logo} alt="" width="44" height="44" />
          SIGMA UG
        </Link>
        {menu.map(([to, label, ikon, end]) => <NavItem key={to} to={to} label={label} ikon={ikon} end={end} />)}
        {maskot ? <div className="aside-maskot"><Maskot pose={maskot} className="maskot-samping" /></div> : <span className="spacer" />}
        {profil && <NavItem to={profil} label="Profil" ikon="nav-profil" />}
        <button className="nav-link" onClick={async () => { await keluar(); navigate('/'); }}>
          <img src={icon('nav-keluar')} alt="" width="20" height="20" />
          Keluar
        </button>
      </aside>
      <div className="kolom">
        <header className="header">
          <span className="chip">{chip}</span>
          <div className="header-kanan">
            {lonceng}
            <UserMenu nama={nama} sub={sub} profil={profil} avatar={avatar} />
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
