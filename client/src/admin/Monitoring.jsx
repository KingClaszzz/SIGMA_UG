import Muat from '../components/Muat.jsx';
// PERAN: ADMIN PRODI — monitoring magang (hanya baca). Admin memantau pengumpulan dokumen akhir mahasiswa; pemeriksaan dokumen
// dilakukan Dosen Pendamping (FR-14), jadi halaman ini tidak punya tombol setujui/tolak.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../api';
import Badge from '../components/Badge.jsx';
import DaftarPratinjau from '../components/Pratinjau.jsx';
import RiwayatStatus from '../components/RiwayatStatus.jsx';
import { tanggalAngka, tanggalPanjang } from '../format';

const STATUS_MAGANG = { berjalan: ['Berjalan', 'kuning'], selesai: ['Selesai', 'hijau'] };
const STATUS_DOK = { belum_lengkap: ['Belum Lengkap', 'merah'], menunggu: ['Menunggu Pemeriksaan', 'kuning'], selesai: ['Selesai Diperiksa', 'hijau'] };
const Lencana = ({ peta, nilai }) => <span className={`badge ${peta[nilai][1]}`}>{peta[nilai][0]}</span>;

export function DaftarMonitoring() {
  const [cari, setCari] = useState('');
  const [magang, setMagang] = useState('semua');
  const [dokumen, setDokumen] = useState('semua');
  const [halaman, setHalaman] = useState(1);
  const { data, error } = useApi(`/admin/monitoring?q=${encodeURIComponent(cari)}&magang=${magang}&dokumen=${dokumen}&halaman=${halaman}`);
  const s = data?.stat;
  const kartu = [['Total Mahasiswa Magang', s?.total], ['Magang Berjalan', s?.berjalan], ['Menunggu Pengumpulan', s?.menunggu_pengumpulan], ['Dokumen Belum Lengkap', s?.belum_lengkap], ['Menunggu Pemeriksaan', s?.menunggu_pemeriksaan], ['Selesai Diperiksa', s?.selesai_diperiksa]];
  const saring = (set) => (e) => { set(e.target.value); setHalaman(1); };
  const jumlahHalaman = data ? Math.max(1, Math.ceil(data.total / data.per_halaman)) : 1;

  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">Monitoring Magang</h1>
        <p className="sub">Pantau pelaksanaan magang dan kelengkapan dokumen akhir mahasiswa yang konversinya sudah disetujui.</p>
      </header>
      <section className="ringkas-grid">
        {kartu.map(([label, angka]) => <div key={label} className="stat-kartu"><span className="angka">{angka ?? '–'}</span><span>{label}</span></div>)}
      </section>

      <section className="kartu">
        <div className="alat-tabel">
          <input type="search" placeholder="Cari nama, NPM, perusahaan, atau dosen…" aria-label="Cari mahasiswa" value={cari} onChange={saring(setCari)} />
          <select aria-label="Status pelaksanaan" value={magang} onChange={saring(setMagang)}>
            <option value="semua">Semua Status Pelaksanaan</option><option value="berjalan">Berjalan</option><option value="selesai">Selesai</option>
          </select>
          <select aria-label="Status dokumen" value={dokumen} onChange={saring(setDokumen)}>
            <option value="semua">Semua Status Dokumen</option><option value="belum_lengkap">Belum Lengkap</option><option value="menunggu">Menunggu Pemeriksaan</option><option value="selesai">Selesai Diperiksa</option>
          </select>
        </div>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.data.length === 0 ? (
          <p className="kosong">Belum ada data monitoring yang cocok.</p>
        ) : (
          <>
            <div className="tabel-wrap">
              <table>
                <thead><tr><th>Nama Mahasiswa</th><th>NPM</th><th>Perusahaan</th><th>Periode Magang</th><th>Dosen Pendamping</th><th>Kelengkapan Dokumen</th><th>Status Pelaksanaan</th><th><span className="sr">Aksi</span></th></tr></thead>
                <tbody>
                  {data.data.map((x) => (
                    <tr key={x.id}>
                      <td>{x.nama}</td><td>{x.npm}</td><td>{x.perusahaan}</td>
                      <td>{tanggalAngka(x.tgl_mulai)} – {tanggalAngka(x.tgl_selesai)}</td>
                      <td>{x.dosen ?? <span className="badge kuning">Belum ditugaskan</span>}</td>
                      <td>
                        <div className="progres" role="progressbar" aria-valuenow={x.progres.disetujui} aria-valuemax={x.progres.total}><span style={{ width: `${(x.progres.disetujui / x.progres.total) * 100}%` }} /></div>
                        <small className="kecil-abu">{x.progres.disetujui}/{x.progres.total} disetujui · <Lencana peta={STATUS_DOK} nilai={x.status_dokumen} /></small>
                      </td>
                      <td><Lencana peta={STATUS_MAGANG} nilai={x.status_magang} /></td>
                      <td><Link className="btn garis kecil" to={`/admin/monitoring/${x.id}`}>Detail</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="halaman-nav">
              <span>{data.total} mahasiswa · Halaman {data.halaman} dari {jumlahHalaman}</span>
              <div className="kanan">
                <button className="btn garis kecil" disabled={data.halaman <= 1} onClick={() => setHalaman(data.halaman - 1)}>Sebelumnya</button>
                <button className="btn garis kecil" disabled={data.halaman >= jumlahHalaman} onClick={() => setHalaman(data.halaman + 1)}>Berikutnya</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const DOK_BADGE = { belum_diunggah: 'belum_diunggah', menunggu: 'menunggu', disetujui: 'disetujui', perlu_perbaikan: 'perlu_perbaikan' };
const DOK_LABEL = { menunggu: 'Menunggu Pemeriksaan', disetujui: 'Disetujui', belum_diunggah: 'Belum Diunggah', perlu_perbaikan: 'Perlu Perbaikan' };

export function DetailMonitoring() {
  const { id } = useParams();
  const { data: k, error } = useApi(`/admin/monitoring/${id}`);
  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!k) return <Muat />;
  const m = k.mahasiswa;
  const total = k.matkul.reduce((t, x) => t + x.sks_diakui, 0);

  return (
    <div className="halaman admin-lebar">
      <Link to="/admin/monitoring" className="kembali">← Kembali ke Monitoring Magang</Link>
      <header className="masuk">
        <h1 className="judul">Detail Monitoring Magang</h1>
        <p className="sub">{m.nama} · {m.npm}</p>
      </header>

      <div className="tiga-kartu">
        <section className="kartu">
          <h2>Profil Mahasiswa</h2>
          <dl className="kv-polos satu-kolom">
            <div><dt>Nama</dt><dd>{m.nama}</dd></div><div><dt>NPM</dt><dd>{m.npm}</dd></div>
            <div><dt>Program Studi</dt><dd>Sistem Informasi</dd></div><div><dt>Email</dt><dd>{m.email}</dd></div>
          </dl>
        </section>
        <section className="kartu">
          <h2>Informasi Magang</h2>
          <dl className="kv-polos satu-kolom">
            <div><dt>Perusahaan</dt><dd>{k.nama_perusahaan}</dd></div><div><dt>Posisi</dt><dd>{k.posisi}</dd></div>
            <div><dt>Periode</dt><dd>{tanggalPanjang(k.tgl_mulai)} s.d. {tanggalPanjang(k.tgl_selesai)}</dd></div>
            <div><dt>Dosen pendamping</dt><dd>{k.dosen?.nama ?? <Link to={`/admin/penugasan/${k.id}`} className="aksi-kecil">Belum ditugaskan — Tugaskan</Link>}</dd></div>
          </dl>
        </section>
        <section className="kartu">
          <h2>Informasi Konversi</h2>
          <dl className="kv-polos satu-kolom">
            <div><dt>Status</dt><dd><Badge nilai="disetujui" /></dd></div>
            <div><dt>Total SKS</dt><dd>{total} SKS</dd></div>
            <div><dt>Nomor surat</dt><dd>{k.surat?.nomor_surat ?? '–'}</dd></div>
            <div><dt>Disetujui</dt><dd>{k.disetujui_pada ? tanggalPanjang(k.disetujui_pada) : '–'}</dd></div>
          </dl>
        </section>
      </div>

      <div className="dua-kolom-admin rata">
        {k.dokumen.map((d) => (
          <section key={d.jenis} className="kartu">
            <div className="kartu-kepala"><h2>{d.label}</h2><Badge nilai={DOK_BADGE[d.status] ?? d.status} label={DOK_LABEL[d.status]} /></div>
            {d.status === 'belum_diunggah' ? <p className="kosong">{d.wajib ? 'Mahasiswa belum mengunggah dokumen ini.' : 'Dokumen opsional, belum diunggah.'}</p> : (
              <>
                <dl className="kv-polos">
                  <div><dt>Tanggal unggah</dt><dd>{tanggalAngka(d.diunggah_pada)}</dd></div>
                  <div><dt>Diperiksa oleh</dt><dd>{d.pemeriksa ?? '–'}</dd></div>
                  <div><dt>Tanggal pemeriksaan</dt><dd>{d.diperiksa_pada ? tanggalAngka(d.diperiksa_pada) : '–'}</dd></div>
                  {d.jenis === 'laporan_akhir' && <div><dt>Pengesahan laporan</dt><dd>{d.ttd_digital ? 'Ditandatangani digital' : d.ada_ttd ? 'PDF bertanda tangan diunggah' : 'Belum ditandatangani'}</dd></div>}
                </dl>
                {d.catatan_dosen && <p className="banner-peringatan" style={{ marginTop: 10 }}><strong>Catatan dosen</strong>{d.catatan_dosen}</p>}
                <DaftarPratinjau berkas={[{ kunci: d.jenis, label: d.label, nama: d.berkas?.nama, path: `/admin/monitoring/${k.id}/dokumen/${d.jenis}` }]} />
                <h3 className="sub-judul">Riwayat</h3>
                <RiwayatStatus item={d.riwayat} />
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
