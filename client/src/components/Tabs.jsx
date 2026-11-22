import { NavLink } from 'react-router-dom';

// items: [[alamat, label, end?]]
export default function Tabs({ items }) {
  return (
    <nav className="tabs">
      {items.map(([to, label, end]) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'aktif' : '')}>{label}</NavLink>
      ))}
    </nav>
  );
}
