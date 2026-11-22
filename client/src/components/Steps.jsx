// Penunjuk langkah wizard. `aktif` berindeks 0: sebelum aktif = selesai, sesudahnya = belum.
export default function Steps({ langkah, aktif }) {
  return (
    <ol className="steps" aria-label="Langkah pengajuan">
      {langkah.map((nama, i) => (
        <li key={nama} className={i < aktif ? 'selesai' : i === aktif ? 'kini' : ''} aria-current={i === aktif ? 'step' : undefined}>
          <span className="bulat">{i < aktif ? '✓' : i + 1}</span>
          {nama}
        </li>
      ))}
    </ol>
  );
}
