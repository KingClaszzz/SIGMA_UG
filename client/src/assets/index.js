const icons = import.meta.glob('./icons/*.svg', { eager: true, query: '?url', import: 'default' });

export const icon = (name) => icons[`./icons/${name}.svg`];
export { default as logo } from './logo.png';
import jas from './owl-jas.webp';
import laptop from './owl-laptop.webp';
import papan from './owl-papan.webp';

// Maskot SIGMA (burung hantu). `mata` = posisi kedua mata pada gambar (satuan piksel gambar) untuk kelopak berkedip; `warna` = warna kulit wajah.
export const OWL = {
  jas: { src: jas, w: 560, h: 940, warna: '#fbf1ef', mata: [{"cx": 189.5, "cy": 385.5, "rx": 55.0, "ry": 56.8}, {"cx": 389.5, "cy": 385.5, "rx": 52.1, "ry": 56.8}] },
  laptop: { src: laptop, w: 560, h: 736, warna: '#fcf2ed', mata: [{"cx": 175.6, "cy": 301.7, "rx": 45.2, "ry": 47.4}, {"cx": 342.0, "cy": 299.8, "rx": 40.4, "ry": 46.1}] },
  papan: { src: papan, w: 560, h: 752, warna: '#fbf0f2', mata: [{"cx": 171.4, "cy": 299.7, "rx": 44.7, "ry": 46.1}, {"cx": 331.8, "cy": 297.1, "rx": 40.6, "ry": 44.7}] },
};
