// Kerangka aplikasi bersama semua peran (sidebar + header). Tiap peran memberi menu dan identitasnya sendiri:
// mahasiswa/MahasiswaShell.jsx, admin/AdminShell.jsx, dosen/DosenShell.jsx.
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { icon, logo } from '../assets';
import { keluar, useKeluarOtomatis } from '../auth/sesi';
import Maskot from './Maskot.jsx';
import './shell.css';

function NavItem({ to, label, ikon, end, onKlik }) {
  return (
    <NavLink to={to} end={end} onClick={onKlik} className={({ isActive }) => `nav-link${isActive ? ' aktif' : ''}`}>
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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuTerbuka, setMenuTerbuka] = useState(false);

  useEffect(() => { setMenuTerbuka(false); }, [pathname]);
  useEffect(() => {
    if (!menuTerbuka) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMenuTerbuka(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuTerbuka]);

  const tutupDrawer = () => setMenuTerbuka(false);

  return (
    <div className="shell">
      {menuTerbuka && <div className="drawer-latar" aria-hidden="true" onClick={tutupDrawer} />}
      <aside className={`aside${menuTerbuka ? ' terbuka' : ''}`}>
        <div className="aside-atas">
          <Link to={beranda} className="brand" onClick={tutupDrawer}>
            <img src={logo} alt="" width="44" height="44" />
            SIGMA UG
          </Link>
          <button type="button" className="drawer-tutup" aria-label="Tutup menu navigasi" onClick={tutupDrawer}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {menu.map(([to, label, ikon, end]) => <NavItem key={to} to={to} label={label} ikon={ikon} end={end} onKlik={tutupDrawer} />)}
        {maskot ? <div className="aside-maskot"><Maskot pose={maskot} className="maskot-samping" /></div> : <span className="spacer" />}
        {profil && <NavItem to={profil} label="Profil" ikon="nav-profil" onKlik={tutupDrawer} />}
        <button className="nav-link" onClick={async () => { tutupDrawer(); await keluar(); navigate('/'); }}>
          <img src={icon('nav-keluar')} alt="" width="20" height="20" />
          Keluar
        </button>
      </aside>
      <div className="kolom">
        <header className="header">
          <div className="header-kiri">
            <button
              type="button"
              className="burger-btn"
              aria-label="Buka menu navigasi"
              aria-expanded={menuTerbuka}
              onClick={() => setMenuTerbuka(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="chip">{chip}</span>
          </div>
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
