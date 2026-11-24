// Pengganti teks "Memuat…": maskot melayang pelan di atas bayangannya, tanpa kata-kata.
import { OWL } from '../assets';
import './muat.css';

export default function Muat({ penuh = false }) {
  return (
    <div className={`muat${penuh ? ' penuh' : ''}`} role="status" aria-label="Memuat">
      <div className="muat-owl"><img src={OWL.jas.src} alt="" draggable="false" /></div>
      <div className="muat-bayangan" aria-hidden="true" />
    </div>
  );
}
