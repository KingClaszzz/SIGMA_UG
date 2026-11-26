import Muat from '../components/Muat.jsx';
// PERAN: DOSEN PENDAMPING — dashboard, daftar mahasiswa bimbingan, dan detail mahasiswa (FR-14, US-19).
// Pemeriksaan dokumen ada di dosen/Monitoring.jsx.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import Badge from '../components/Badge.jsx';
import TautanBerkas from '../components/Berkas.jsx';
import RiwayatStatus from '../components/RiwayatStatus.jsx';
import { durasi, tanggalAngka, tanggalPanjang } from '../format';
import { inisial } from './DosenShell.jsx';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
// "Agu–Des 2026"
const rentangBulan = (a, b) => `${BULAN[Number(a.slice(5, 7)) - 1]}–${BULAN[Number(b.slice(5, 7)) - 1]} ${b.slice(0, 4)}`;
const Progres = ({ p }) => (
  <>
    <div className="progres" role="progressbar" aria-valuenow={p.disetujui} aria-valuemax={p.total}><span style={{ width: `${(p.disetujui / p.total) * 100}%` }} /></div>
    <small className="kecil-abu">{p.disetujui} dari {p.total} dokumen wajib</small>
  </>
);

export function DashboardDosen() {
  const { data: d, error } = useApi('/dosen/dashboard');
  const { data: profil } = useApi('/dosen/profil');
  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!d) return <Muat />;
  const r = d.ringkasan;
  const kartu = [['Total Mahasiswa Bimbingan', r.bimbingan], ['Logbook Menunggu Pemeriksaan', r.logbook_menunggu], ['Laporan Akhir Menunggu Pemeriksaan', r.laporan_menunggu], ['Dokumen Perlu Perbaikan', r.perlu_perbaikan]];
  const j = d.jadwal;
  const tenggat = [['Tenggat pemeriksaan dokumen', j.batas_pemeriksaan, 'kuning'], ['Batas waktu revisi mahasiswa', j.batas_revisi, 'kuning'], ['Monitoring magang berakhir', j.akhir_magang, 'ungu']];
  return (
    <div className="halaman admin-lebar">
      <section className="banner masuk">
        <div>
          <h1>Selamat Datang, Dosen Pendamping</h1>
          <p>{profil?.nama} · Pantau kegiatan magang dan periksa dokumen mahasiswa bimbingan Anda.</p>
        </div>
      </section>
      <section className="ringkas-grid empat">
        {kartu.map(([label, angka]) => <div key={label} className="stat-kartu"><span className="angka">{angka}</span><span>{label}</span></div>)}
      </section>

      <div className="dua-kolom-admin">
        <section className="kartu masuk">
          <div className="kartu-kepala"><h2>Aktivitas Terbaru</h2><Link to="/dosen/monitoring" className="aksi-kecil">Lihat Semua</Link></div>
          {d.aktivitas.length === 0 ? <p className="kosong">Tidak ada dokumen yang menunggu pemeriksaan.</p> : (
            <div className="tabel-wrap">
              <table>
                <thead><tr><th>Mahasiswa</th><th>NPM</th><th>Dokumen</th><th>Tanggal</th><th>Status</th><th><span className="sr">Aksi</span></th></tr></thead>
                <tbody>
                  {d.aktivitas.map((x, i) => (
                    <tr key={i}>
                      <td>{x.nama}</td><td>{x.npm}</td><td>{x.dokumen}</td><td>{tanggalAngka(x.pada)}</td>
                      <td><Badge nilai={x.status} label={x.status === 'menunggu_ulang' ? 'Menunggu Pemeriksaan Ulang' : 'Menunggu Pemeriksaan'} /></td>
                      <td><Link className="btn garis kecil" to={`/dosen/monitoring/${x.id}/${x.jenis}`}>Detail</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="kolom-samping">
          <section className="kartu masuk" style={{ '--urut': 1 }}>
            <h2>Jadwal dan Tenggat Waktu</h2>
            <ol className="tenggat">
              {tenggat.map(([judul, tgl, warna]) => <li key={judul} className={warna}><strong>{judul}</strong><span>{tgl ? tanggalPanjang(tgl) : 'Belum ada'}</span></li>)}
            </ol>
          </section>
          <section className="kartu masuk" style={{ '--urut': 2 }}>
            <h2>Mahasiswa Terbaru</h2>
            {d.terbaru.length === 0 ? <p className="kosong">Belum ada mahasiswa bimbingan.</p> : (
              <ul className="daftar-dok">
                {d.terbaru.map((x) => <li key={x.id}><Link to={`/dosen/bimbingan/${x.id}`}>{x.nama} · {x.npm}</Link></li>)}
              </ul>
            )}
            <p className="catatan-kecil">Baru ditetapkan Admin Prodi</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export function DaftarBimbingan() {
  const [cari, setCari] = useState('');
  const [magang, setMagang] = useState('semua');
  const { data, error } = useApi(`/dosen/bimbingan?q=${encodeURIComponent(cari)}&magang=${magang}`);
  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">Mahasiswa Bimbingan</h1>
        <p className="sub">Daftar mahasiswa yang berada dalam bimbingan Anda{data ? ` · ${data.length} mahasiswa` : ''}</p>
      </header>
      <section className="kartu">
        <div className="alat-tabel">
          <label style={{ flex: '1 1 320px' }}>Cari nama atau NPM
            <input type="search" placeholder="contoh: Zaki atau 10122001" value={cari} onChange={(e) => setCari(e.target.value)} />
          </label>
          <label>Status magang
            <select value={magang} onChange={(e) => setMagang(e.target.value)}><option value="semua">Semua</option><option value="berjalan">Berjalan</option><option value="selesai">Selesai</option></select>
          </label>
        </div>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.length === 0 ? <p className="kosong">Belum ada mahasiswa bimbingan yang cocok.</p> : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>No</th><th>Nama Mahasiswa</th><th>NPM</th><th>Program Studi</th><th>Perusahaan</th><th>Periode Magang</th><th>Progres Dokumen</th><th>Status</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((x, i) => (
                  <tr key={x.id}>
                    <td>{i + 1}</td><td><strong>{x.nama}</strong></td><td>{x.npm}</td><td>Sistem Informasi</td><td>{x.nama_perusahaan}</td>
                    <td>{rentangBulan(x.tgl_mulai, x.tgl_selesai)}</td>
                    <td style={{ minWidth: 150 }}><Progres p={x.progres} /></td>
                    <td><Badge nilai={x.status_magang === 'selesai' ? 'selesai' : 'berjalan'} /></td>
                    <td><Link className="btn garis kecil" to={`/dosen/bimbingan/${x.id}`}>Detail</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function DetailBimbingan() {
  const { id } = useParams();
  const { data: b, error } = useApi(`/dosen/bimbingan/${id}`);
  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!b) return <Muat />;
  const k = b.konversi;
  const disetujui = ['diterbitkan', 'selesai'].includes(k.status);
  return (
    <div className="halaman admin-lebar">
      <Link to="/dosen/bimbingan" className="kembali">← Kembali ke Mahasiswa Bimbingan</Link>
      <section className="kartu profil-kepala masuk">
        <span className="avatar-besar" aria-hidden="true">{inisial(b.nama)}</span>
        <div style={{ flex: 1 }}>
          <h1 className="judul" style={{ fontSize: 22 }}>{b.nama}</h1>
          <p className="sub">{b.npm} · Sistem Informasi · {b.tahun_akademik ?? '–'}</p>
        </div>
        <Badge nilai={b.status_magang === 'selesai' ? 'selesai' : 'berjalan'} label={b.status_magang === 'selesai' ? 'Magang Selesai' : 'Magang Berjalan'} />
      </section>

      <div className="tiga-kartu">
        <section className="kartu">
          <h2>Informasi Pribadi</h2>
          <dl className="kv-polos"><div><dt>Email</dt><dd>{b.email}</dd></div><div><dt>Telepon</dt><dd>{b.no_telepon}</dd></div><div><dt>Fakultas</dt><dd>FIKTI</dd></div><div><dt>Semester</dt><dd>{b.semester}</dd></div></dl>
        </section>
        <section className="kartu">
          <h2>Informasi Perusahaan</h2>
          <dl className="kv-polos">
            <div><dt>Perusahaan</dt><dd>{b.nama_perusahaan}</dd></div><div><dt>Divisi</dt><dd>{b.posisi}</dd></div>
            <div><dt>Alamat</dt><dd>{b.alamat_perusahaan}</dd></div><div><dt>Periode</dt><dd>{rentangBulan(b.tgl_mulai, b.tgl_selesai)} ({durasi(b.tgl_mulai, b.tgl_selesai)})</dd></div>
          </dl>
        </section>
        <section className="kartu">
          <h2>Informasi Konversi SKS</h2>
          <div className="baris-kecil" style={{ marginTop: 0 }}><Badge nilai={disetujui ? 'disetujui' : k.status} label={disetujui ? 'Disetujui' : undefined} /></div>
          {k.matkul.length > 0 && <p className="isi" style={{ marginTop: 10 }}>Mata kuliah: {k.matkul.map((m) => m.nama_mk).join(', ')}<br />Total: {k.total_sks} SKS</p>}
          {k.nomor_surat && (
            <div className="berkas" style={{ marginTop: 10 }}>
              <div className="berkas-isi"><p className="berkas-nama">Surat konversi {k.nomor_surat}</p></div>
              <TautanBerkas className="badge abu" path={`/dosen/bimbingan/${b.id}/surat`}>Hanya dilihat</TautanBerkas>
            </div>
          )}
        </section>
      </div>

      <div className="ringkas-grid empat">
        {b.dokumen.map((d) => (
          <section key={d.jenis} className="kartu">
            <h2 style={{ fontSize: 14 }}>{{ laporan_akhir: 'Laporan Akhir', nilai_mitra: 'Nilai Akhir Mitra', sertifikat: 'Sertifikat Magang', logbook: 'Logbook' }[d.jenis]}</h2>
            <Badge nilai={d.status} label={d.status === 'menunggu' ? 'Menunggu Pemeriksaan' : d.status === 'menunggu_ulang' ? 'Menunggu Pemeriksaan Ulang' : undefined} />
            <p className="catatan-kecil">Dikumpulkan: {d.diunggah_pada ? tanggalAngka(d.diunggah_pada) : '–'}<br />Diperiksa terakhir: {d.diperiksa_pada ? tanggalAngka(d.diperiksa_pada) : '–'}</p>
            <Link className="btn garis kecil" style={{ marginTop: 10 }} to={`/dosen/monitoring/${b.id}/${d.jenis}`}>Lihat Detail</Link>
          </section>
        ))}
      </div>

      <section className="kartu">
        <h2>Aktivitas Mahasiswa</h2>
        {b.aktivitas.length === 0 ? <p className="kosong">Belum ada aktivitas.</p> : <RiwayatStatus item={b.aktivitas} />}
      </section>
    </div>
  );
}
