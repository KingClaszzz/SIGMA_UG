// PERAN: ADMIN PRODI — penugasan dosen pendamping (FR-11). Dosen ditetapkan (atau diganti) untuk konversi yang sudah disetujui;
// surat konversi sudah terbit saat konversi disetujui (admin/Konversi.jsx), jadi penugasan tidak menerbitkan surat.
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, useAksi, useApi } from '../api';
import { tanggalAngka, tanggalPanjang } from '../format';

const TAB = [['belum', 'Belum Ditugaskan'], ['sudah', 'Sudah Ditugaskan']];

export function DaftarPenugasan() {
  const [params, setParams] = useSearchParams();
  const tab = TAB.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'belum';
  const [cari, setCari] = useState('');
  const { data: r } = useApi('/admin/penugasan/ringkasan');
  const { data, error } = useApi(`/admin/konversi?penugasan=${tab}&q=${encodeURIComponent(cari)}`);
  const kartu = [['Total Disetujui', r?.total], ['Belum Ditugaskan', r?.belum], ['Sudah Ditugaskan', r?.sudah]];

  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">Penugasan Dosen</h1>
        <p className="sub">Tetapkan dosen pendamping untuk mahasiswa yang konversinya sudah disetujui.</p>
      </header>
      <section className="tiga-kartu">
        {kartu.map(([label, angka]) => <div key={label} className="stat-kartu"><span className="angka">{angka ?? '–'}</span><span>{label}</span></div>)}
      </section>

      <section className="kartu">
        <div className="tab-garis" role="tablist">
          {TAB.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'aktif' : ''} onClick={() => setParams({ tab: k })}>{label}</button>)}
        </div>
        <div className="alat-tabel">
          <input type="search" placeholder="Cari nama, NPM, atau perusahaan…" aria-label="Cari mahasiswa" value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <p className="kosong">Memuat…</p> : data.length === 0 ? (
          <p className="kosong">{tab === 'belum' ? 'Semua konversi yang disetujui sudah punya dosen pendamping.' : 'Belum ada penugasan.'}</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>No</th><th>Nama Mahasiswa</th><th>NPM</th><th>Perusahaan</th><th>Tanggal Disetujui</th>{tab === 'sudah' && <th>Dosen Pendamping</th>}<th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((k, i) => (
                  <tr key={k.id}>
                    <td>{i + 1}</td><td>{k.mahasiswa.nama}</td><td>{k.mahasiswa.npm}</td><td>{k.nama_perusahaan}</td>
                    <td>{k.disetujui_pada ? tanggalAngka(k.disetujui_pada) : '–'}</td>
                    {tab === 'sudah' && <td>{k.dosen?.nama}</td>}
                    <td><Link className={`btn kecil ${k.dosen ? 'garis' : 'kuning'}`} to={`/admin/penugasan/${k.id}`}>{k.dosen ? 'Detail' : 'Tugaskan'}</Link></td>
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

export function DetailPenugasan() {
  const { id } = useParams();
  const { data: k, error, muat } = useApi(`/admin/konversi/${id}`);
  const { data: dosen } = useApi('/admin/dosen');
  const [cari, setCari] = useState('');
  const [pilih, setPilih] = useState(null);
  const [ganti, setGanti] = useState(false);
  const [baruSaja, setBaruSaja] = useState(false);
  const { sibuk, galat, jalan } = useAksi(muat);

  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!k || !dosen) return <p className="sub">Memuat…</p>;
  const m = k.mahasiswa;
  const total = k.matkul.reduce((t, x) => t + x.sks_diakui, 0);
  const tampil = dosen.filter((d) => `${d.nama} ${d.nidn}`.toLowerCase().includes(cari.trim().toLowerCase()));
  const dapat = ['diterbitkan', 'selesai'].includes(k.status);
  const memilih = dapat && (!k.dosen || ganti);

  return (
    <div className="halaman admin-lebar">
      <Link to="/admin/penugasan" className="kembali">← Kembali ke daftar</Link>
      <header className="masuk">
        <h1 className="judul">{k.dosen && !ganti ? 'Detail Penugasan' : 'Penugasan Dosen Pendamping'}</h1>
        <p className="sub">{m.nama} · {k.nama_perusahaan}</p>
      </header>
      {galat && <p className="banner-galat" role="alert">{galat}</p>}
      {baruSaja && k.dosen && <p className="banner-ok" role="status"><strong>Detail Penugasan Berhasil</strong>{k.dosen.nama} ditetapkan sebagai dosen pendamping {m.nama}.</p>}
      {!dapat && <p className="banner-info">Dosen pendamping ditetapkan setelah konversi disetujui. <Link to={`/admin/konversi/${k.id}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>Buka pengajuan konversi</Link></p>}

      <div className="dua-kolom-admin">
        <div className="kolom-samping">
          <section className="kartu">
            <h2>Informasi Mahasiswa</h2>
            <dl className="kv-polos">
              <div><dt>Nama</dt><dd>{m.nama}</dd></div>
              <div><dt>NPM</dt><dd>{m.npm}</dd></div>
              <div><dt>Program Studi</dt><dd>Sistem Informasi</dd></div>
              <div><dt>Fakultas</dt><dd>FIKTI</dd></div>
              <div className="lebar"><dt>Email</dt><dd>{m.email}</dd></div>
            </dl>
          </section>
          <section className="kartu">
            <h2>Informasi Magang dan Konversi</h2>
            <dl className="kv-polos">
              <div><dt>Perusahaan</dt><dd>{k.nama_perusahaan}</dd></div>
              <div><dt>Posisi</dt><dd>{k.posisi}</dd></div>
              <div className="lebar"><dt>Periode</dt><dd>{tanggalPanjang(k.tgl_mulai)} s.d. {tanggalPanjang(k.tgl_selesai)}</dd></div>
              <div><dt>Total SKS dikonversi</dt><dd>{total} SKS</dd></div>
              <div><dt>Nomor surat konversi</dt><dd>{k.surat?.nomor_surat ?? '–'}</dd></div>
            </dl>
            <ul className="daftar-dok" style={{ marginTop: 12 }}>
              {k.matkul.map((x) => <li key={x.id_matkul}><span>{x.kode_mk} · {x.nama_mk}</span><strong>{x.sks_diakui} SKS</strong></li>)}
            </ul>
          </section>
        </div>

        <div className="kolom-samping">
          {memilih ? (
            <section className="kartu">
              <h2>Pilih Dosen Pendamping</h2>
              <form onSubmit={(e) => { e.preventDefault(); jalan(async () => { await api(`/admin/konversi/${id}/dosen`, { method: 'POST', body: { id_dosen: pilih } }); setBaruSaja(true); setGanti(false); setPilih(null); }, { judul: 'Dosen pendamping ditetapkan' }); }}>
                <label>Dosen pendamping *
                  <input type="search" placeholder="Cari nama dosen…" value={cari} onChange={(e) => setCari(e.target.value)} />
                </label>
                <div className="daftar-pilih" role="radiogroup" aria-label="Dosen pendamping">
                  {tampil.length === 0 && <p className="kosong" style={{ padding: 12 }}>{dosen.length === 0 ? <>Belum ada akun dosen aktif. Buat di <Link to="/admin/akun">Manajemen Akun</Link>.</> : 'Dosen tidak ditemukan.'}</p>}
                  {tampil.map((d) => (
                    <label key={d.id} className={`pilih-kartu${pilih === d.id ? ' dipilih' : ''}`}>
                      <input type="radio" name="dosen" checked={pilih === d.id} onChange={() => setPilih(d.id)} />
                      <span><strong>{d.nama}</strong> · NIDN {d.nidn}<small>Sistem Informasi · FIKTI · {d.bimbingan} mahasiswa bimbingan</small></span>
                    </label>
                  ))}
                </div>
                <div className="baris-aksi">
                  <button className="btn garis" type="button" onClick={() => (k.dosen ? setGanti(false) : window.history.back())}>Batal</button>
                  <button className="btn kuning" type="submit" disabled={sibuk || !pilih}>{sibuk ? 'Menyimpan…' : 'Simpan Penugasan'}</button>
                </div>
              </form>
            </section>
          ) : k.dosen && (
            <>
              <section className="kartu">
                <h2>Dosen Pendamping</h2>
                <dl className="kv-polos">
                  <div><dt>Nama</dt><dd>{k.dosen.nama}</dd></div>
                  <div><dt>NIDN</dt><dd>{k.dosen.nidn}</dd></div>
                  <div><dt>Ditugaskan pada</dt><dd>{tanggalPanjang(k.dosen.ditugaskan_pada)}</dd></div>
                  <div><dt>Ditugaskan oleh</dt><dd>{k.dosen.oleh ?? '–'}</dd></div>
                </dl>
                <div className="aksi-keputusan">
                  <Link className="btn isi" to={`/admin/monitoring/${k.id}`}>Lihat Monitoring</Link>
                  <button className="btn garis" onClick={() => setGanti(true)}>Ubah Dosen Pendamping</button>
                </div>
              </section>
              <section className="kartu">
                <h2>Riwayat Penugasan</h2>
                <ol className="riwayat-status">
                  <li><strong>{k.dosen.nama} ditetapkan sebagai dosen pendamping</strong><span>{tanggalAngka(k.dosen.ditugaskan_pada)}{k.dosen.oleh ? ` · ${k.dosen.oleh}` : ''}</span></li>
                </ol>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
