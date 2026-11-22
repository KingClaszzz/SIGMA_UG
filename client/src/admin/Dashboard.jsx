// PERAN: ADMIN PRODI (UI-11). Banner, enam ringkasan, pengajuan terbaru, dan jadwal/tenggat periode berjalan.
import { Link } from 'react-router-dom';
import { icon } from '../assets';
import { useApi } from '../api';
import Badge from '../components/Badge.jsx';
import { tanggalAngka, tanggalPanjang } from '../format';

const TUJUAN = { rekomendasi: 'rekomendasi', konversi: 'konversi', dokumen: 'monitoring' };

// Kartu ringkasan: ikon berkotak, angka, keterangan. `to` membuka daftar yang sesuai.
function Kartu({ to, ikon, angka, label }) {
  return (
    <Link to={to} className="ringkas">
      <span className="ringkas-ikon"><img src={icon(ikon)} alt="" width="22" height="22" /></span>
      <div><p className="ringkas-angka">{angka}</p><p className="ringkas-label">{label}</p></div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: d, error } = useApi('/admin/dashboard');
  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!d) return <p className="sub">Memuat…</p>;
  const { ringkasan: r, periode } = d;
  const tenggat = periode && [
    ['Pengajuan surat rekomendasi', periode.tgl_tutup, 'kuning'],
    ['Pengajuan konversi SKS', periode.batas_konversi, 'kuning'],
    ['Pengumpulan dokumen akhir', periode.batas_laporan, 'ungu'],
  ];

  return (
    <div className="halaman admin-lebar">
      <section className="banner masuk">
        <div>
          <h1>Dashboard Admin Prodi</h1>
          <p>Selamat datang di SIGMA UG. Kelola pengajuan dan pantau seluruh proses administrasi magang mahasiswa.</p>
          <p className="banner-kecil">{periode ? `Tahun Akademik ${periode.tahun_akademik.slice(4)} · Gelombang ${periode.gelombang} · Periode Aktif` : 'Belum ada periode magang yang dipublikasikan'}</p>
        </div>
      </section>

      <section className="ringkas-grid">
        <Kartu to="/admin/akun" ikon="stat-dosen" angka={r.total_mahasiswa} label="Total Mahasiswa" />
        <Kartu to="/admin/rekomendasi?status=diajukan" ikon="nav-surat" angka={r.surat_menunggu} label="Pengajuan Surat Menunggu Pemeriksaan" />
        <Kartu to="/admin/konversi?status=diajukan" ikon="nav-konversi" angka={r.konversi_menunggu} label="Pengajuan Konversi Menunggu Pemeriksaan" />
        <Kartu to="/admin/penugasan" ikon="stat-batas" angka={r.belum_dosen} label="Belum Memiliki Dosen Pendamping" />
        <Kartu to="/admin/monitoring" ikon="stat-dosen" angka={r.sedang_magang} label="Mahasiswa Sedang Magang" />
        <Kartu to="/admin/monitoring" ikon="nav-dokumen" angka={r.dokumen_belum_lengkap} label="Dokumen Akhir Belum Lengkap" />
      </section>

      <div className="dua-kolom-admin">
        <section className="kartu masuk">
          <div className="kartu-kepala"><h2>Pengajuan Terbaru</h2><Link to="/admin/rekomendasi?status=diajukan" className="aksi-kecil">Lihat Semua</Link></div>
          {d.terbaru.length === 0 ? <p className="kosong">Belum ada pengajuan yang menunggu pemeriksaan.</p> : (
            <div className="tabel-wrap">
              <table>
                <thead><tr><th>Nama Mahasiswa</th><th>NPM</th><th>Dokumen</th><th>Tanggal</th><th>Status</th><th><span className="sr">Aksi</span></th></tr></thead>
                <tbody>
                  {d.terbaru.map((x) => (
                    <tr key={`${x.jenis}-${x.id}`}>
                      <td>{x.nama}</td><td>{x.npm}</td><td>{x.dokumen}</td><td>{tanggalAngka(x.pada)}</td>
                      <td><Badge nilai="diajukan" label="Menunggu Pemeriksaan" /></td>
                      <td><Link className="btn garis kecil" to={`/admin/${TUJUAN[x.jenis]}/${x.id}`}>Periksa</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="kartu masuk" style={{ '--urut': 1 }}>
          <h2>Jadwal dan Tenggat Waktu</h2>
          {tenggat ? (
            <ol className="tenggat">
              {tenggat.map(([judul, tgl, warna]) => (
                <li key={judul} className={warna}><strong>{judul}</strong><span>{tgl ? tanggalPanjang(tgl) : 'Belum ditetapkan'}</span></li>
              ))}
            </ol>
          ) : (
            <p className="banner-peringatan"><strong>Belum ada periode</strong>Mahasiswa belum bisa mengajukan surat. <Link to="/admin/periode/baru" style={{ fontWeight: 600, textDecoration: 'underline' }}>Buat periode</Link></p>
          )}
        </section>
      </div>
    </div>
  );
}
