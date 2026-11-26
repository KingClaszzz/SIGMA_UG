import Muat from '../components/Muat.jsx';
// PERAN: MAHASISWA. Dasbor Admin Prodi dan Dosen Pendamping berbeda (ringkasan antrean validasi / mahasiswa
// bimbingan) dan dibangun terpisah di src/admin/ dan src/dosen/.
import TautanBerkas from '../components/Berkas.jsx';
import { Link, useOutletContext } from 'react-router-dom';
import { icon } from '../assets';
import { useApi } from '../api';
import Badge from '../components/Badge.jsx';
import { rentang, rentangOpsional, tanggalAngka, tanggalPanjang } from '../format';
import './dashboard.css';

const namaJadwal = { pengajuan: 'Pengajuan surat rekomendasi', konversi: 'Pengajuan konversi SKS' };

function kalimatBanner(periode) {
  const jadwal = periode?.jadwal ?? [];
  const dibuka = jadwal.find((j) => j.status === 'dibuka');
  if (dibuka) return `Periode ${dibuka.jenis === 'konversi' ? 'konversi magang' : 'pengajuan surat rekomendasi'} dibuka sampai ${tanggalPanjang(dibuka.tutup)}.`;
  const berikut = jadwal.find((j) => j.status === 'akan_dibuka');
  if (berikut) return `Periode ${berikut.jenis === 'konversi' ? 'konversi magang' : 'pengajuan surat rekomendasi'} dibuka mulai ${tanggalPanjang(berikut.buka)}.`;
  return 'Belum ada periode magang yang dibuka.';
}

function Stat({ ikon, warna, nilai, label, besar, urut }) {
  return (
    <div className="stat masuk" style={{ '--urut': urut }}>
      <span className="stat-ikon" style={{ background: warna }}>
        <img src={icon(ikon)} alt="" width="24" height="24" />
      </span>
      <div>
        <p className={`stat-nilai${besar ? ' besar' : ''}`}>{nilai}</p>
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { me, periode } = useOutletContext();
  const { data: d, error } = useApi('/mahasiswa/dashboard');

  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!d) return <Muat />;

  return (
    <div className="halaman">
      <section className="banner masuk">
        <div>
          <h1>Halo, {me.nama.split(' ')[0]}</h1>
          <p>{kalimatBanner(periode)}</p>
        </div>
        <Link to="/surat-rekomendasi" className="btn-kuning">Ajukan Surat Baru</Link>
      </section>

      <section className="stats">
        <Stat urut={1} ikon="stat-batas" warna="var(--grey-94)" besar nilai={`${d.sudah_magang} / ${d.batas_magang}`} label="Batas magang" />
        <Stat urut={2} ikon="stat-dosen" warna="var(--orange-62)" nilai={d.dosen_pendamping ?? 'Belum ditetapkan'} label="Dosen pendamping" />
        <Stat urut={3} ikon="stat-sks" warna="var(--violet-24)" nilai={`${d.sks_konversi} SKS`} label="Konversi ditetapkan" />
      </section>

      <section className="kartu masuk" style={{ '--urut': 4 }}>
        <h2>Pengajuan Surat Rekomendasi</h2>
        {d.pengajuan.length === 0 ? (
          <p className="kosong">Belum ada pengajuan. <Link to="/surat-rekomendasi">Ajukan surat rekomendasi</Link></p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead>
                <tr><th>Perusahaan</th><th>Tanggal</th><th>Status</th><th><span className="sr">Aksi</span></th></tr>
              </thead>
              <tbody>
                {d.pengajuan.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nama_perusahaan}</td>
                    <td>{tanggalAngka(p.tanggal)}</td>
                    <td><Badge nilai={p.status} /></td>
                    <td className="td-aksi">
                      <Link className="btn garis kecil" to={`/surat-rekomendasi/riwayat/${p.id}`}>Lihat Detail</Link>
                      {p.surat_tersedia && <TautanBerkas className="btn isi kecil" path={`/mahasiswa/rekomendasi/${p.id}/surat`}>Unduh Surat</TautanBerkas>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="dua">
        <section className="kartu masuk" style={{ '--urut': 5 }}>
          <h2>Perlu tindakan</h2>
          {d.tindakan.length === 0 ? (
            <p className="isi">Belum ada tindakan yang perlu Anda lakukan.</p>
          ) : (
            <ul className="tindakan">
              {d.tindakan.map((t) => (
                <li key={t.label}>
                  <p className="isi">{t.teks}</p>
                  <Link to={t.tautan} className="btn isi">{t.label}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="kartu masuk" style={{ '--urut': 6 }}>
          <h2>Jadwal magang</h2>
          {periode?.tersedia ? (
            <ul className="jadwal">
              {periode.jadwal.map((j) => (
                <li key={j.jenis}>
                  <div>
                    <p className="jadwal-nama">{namaJadwal[j.jenis]}</p>
                    <p className="stat-label">{rentang(j.buka, j.tutup)}</p>
                  </div>
                  <Badge nilai={j.status} />
                </li>
              ))}
              {periode.tgl_pengumuman && (
                <li>
                  <div>
                    <p className="jadwal-nama">Pengumuman / konfirmasi penerimaan</p>
                    <p className="stat-label">{tanggalPanjang(periode.tgl_pengumuman)}</p>
                  </div>
                </li>
              )}
              {(periode.tgl_mulai_pelaksanaan || periode.tgl_selesai_pelaksanaan) && (
                <li>
                  <div>
                    <p className="jadwal-nama">Pelaksanaan magang</p>
                    <p className="stat-label">{rentangOpsional(periode.tgl_mulai_pelaksanaan, periode.tgl_selesai_pelaksanaan)}</p>
                  </div>
                </li>
              )}
              {periode.batas_laporan && (
                <li>
                  <div>
                    <p className="jadwal-nama">Pengumpulan dokumen &amp; laporan akhir</p>
                    <p className="stat-label">
                      {periode.tgl_buka_dokumen ? rentang(periode.tgl_buka_dokumen, periode.batas_laporan) : `Batas: ${tanggalPanjang(periode.batas_laporan)}`}
                    </p>
                  </div>
                </li>
              )}
            </ul>
          ) : (
            <p className="isi">Admin Prodi belum mengumumkan periode magang.</p>
          )}
        </section>
      </div>
    </div>
  );
}
