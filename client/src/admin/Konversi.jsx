// PERAN: ADMIN PRODI — konversi SKS (FR-06, FR-07, FR-08).
// Alur: periksa berkas (diajukan → ditinjau) → pemetaan mata kuliah dan SKS → "Setujui Konversi" menerbitkan surat konversi (→ diterbitkan).
// Dosen pendamping ditetapkan terpisah di Penugasan Dosen (admin/Penugasan.jsx).
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, unduhBerkas, useAksi, useApi } from '../api';
import Badge from '../components/Badge.jsx';
import Dialog from '../components/Dialog.jsx';
import TautanBerkas from '../components/Berkas.jsx';
import DaftarPratinjau from '../components/Pratinjau.jsx';
import RiwayatStatus from '../components/RiwayatStatus.jsx';
import { tanggalAngka, tanggalPanjang } from '../format';

const FILTER = [['semua', 'Semua Status'], ['diajukan', 'Menunggu Pemeriksaan'], ['ditinjau', 'Pemetaan'], ['disetujui', 'Disetujui'], ['ditolak', 'Ditolak']];
const LABEL = { diajukan: 'Menunggu Pemeriksaan', ditinjau: 'Pemetaan', diproses: 'Pemetaan', diterbitkan: 'Disetujui', selesai: 'Disetujui' };
const BADGE = { diproses: 'ditinjau', diterbitkan: 'disetujui', selesai: 'disetujui' };
const Status = ({ nilai }) => <Badge nilai={BADGE[nilai] ?? nilai} label={LABEL[nilai]} />;

function Ringkasan() {
  const { data: r } = useApi('/admin/konversi/ringkasan');
  const kartu = [['Total Pengajuan', r?.total], ['Menunggu Pemeriksaan', r?.menunggu], ['Tahap Pemetaan', r?.pemetaan], ['Disetujui', r?.disetujui], ['Ditolak', r?.ditolak]];
  return (
    <section className="stat-admin">
      {kartu.map(([label, angka]) => <div key={label} className="stat-kartu"><span className="angka">{angka ?? '–'}</span><span>{label}</span></div>)}
    </section>
  );
}

export function DaftarKonversi() {
  const [params, setParams] = useSearchParams();
  const status = FILTER.some(([k]) => k === params.get('status')) ? params.get('status') : 'semua';
  const [cari, setCari] = useState('');
  const { data, error } = useApi(`/admin/konversi?status=${status}&q=${encodeURIComponent(cari)}`);

  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">Penerimaan Konversi SKS</h1>
        <p className="sub">Periksa berkas penerimaan dan silabus, petakan mata kuliah, lalu setujui konversi.</p>
      </header>
      <Ringkasan />
      <section className="kartu">
        <div className="alat-tabel">
          <input type="search" placeholder="Cari nama, NPM, atau perusahaan…" aria-label="Cari pengajuan" value={cari} onChange={(e) => setCari(e.target.value)} />
          <select aria-label="Status pengajuan" value={status} onChange={(e) => setParams({ status: e.target.value })}>
            {FILTER.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <p className="kosong">Memuat…</p> : data.length === 0 ? (
          <p className="kosong">Tidak ada pengajuan konversi yang cocok.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>No</th><th>Nama Mahasiswa</th><th>NPM</th><th>Perusahaan</th><th>Tanggal Pengajuan</th><th>Status</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((k, i) => (
                  <tr key={k.id}>
                    <td>{i + 1}</td><td>{k.mahasiswa.nama}</td><td>{k.mahasiswa.npm}</td>
                    <td>{k.nama_perusahaan}</td>
                    <td>{tanggalAngka(k.diajukan_pada)}</td>
                    <td><Status nilai={k.status} /></td>
                    <td><Link className="btn garis kecil" to={`/admin/konversi/${k.id}`}>{k.status === 'diajukan' ? 'Periksa' : 'Detail'}</Link></td>
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

// Kartu "Kuota Konversi Magang": berapa konversi yang sudah disetujui dari batas dua kali (BR-03).
function Kuota({ kuota }) {
  const sisa = Math.max(0, kuota.batas - kuota.disetujui);
  return (
    <section className="kartu kuota">
      <h2>Kuota Konversi Magang</h2>
      <p className="isi">Konversi disetujui: <strong>{kuota.disetujui} dari {kuota.batas}</strong> · Sisa kuota: <strong>{sisa}</strong></p>
      <div className="progres" role="progressbar" aria-valuenow={kuota.disetujui} aria-valuemax={kuota.batas}><span style={{ width: `${Math.min(100, (kuota.disetujui / kuota.batas) * 100)}%` }} /></div>
    </section>
  );
}

const InfoMahasiswa = ({ k }) => (
  <section className="kartu">
    <h2>Informasi Mahasiswa</h2>
    <dl className="kv-polos">
      <div><dt>Nama</dt><dd>{k.mahasiswa.nama}</dd></div>
      <div><dt>NPM</dt><dd>{k.mahasiswa.npm}</dd></div>
      <div><dt>Program Studi</dt><dd>Sistem Informasi</dd></div>
      <div><dt>Fakultas</dt><dd>FIKTI</dd></div>
      <div><dt>Semester</dt><dd>{k.mahasiswa.semester}</dd></div>
      <div><dt>No. Telepon</dt><dd>{k.mahasiswa.no_telepon}</dd></div>
      <div className="lebar"><dt>Email</dt><dd>{k.mahasiswa.email}</dd></div>
    </dl>
  </section>
);

const InfoPerusahaan = ({ k }) => (
  <section className="kartu">
    <h2>Informasi Perusahaan</h2>
    <dl className="kv-polos">
      <div><dt>Perusahaan</dt><dd>{k.nama_perusahaan}</dd></div>
      <div><dt>Posisi / divisi</dt><dd>{k.posisi}</dd></div>
      <div><dt>Tahun Akademik</dt><dd>{k.tahun_akademik ?? '–'}</dd></div>
      <div className="lebar"><dt>Periode magang</dt><dd>{tanggalPanjang(k.tgl_mulai)} s.d. {tanggalPanjang(k.tgl_selesai)}</dd></div>
      <div className="lebar"><dt>Alamat</dt><dd>{k.alamat_perusahaan}</dd></div>
    </dl>
  </section>
);

// Satu berkas = satu kartu (desain: "Surat Penerimaan" dan "Silabus Magang" terpisah, masing-masing berlencana Lengkap).
function KartuBerkas({ judul, kunci, berkas, path }) {
  return (
    <section className="kartu">
      <div className="kartu-kepala"><h2>{judul}</h2>{berkas ? <span className="badge hijau">Lengkap</span> : <span className="badge merah">Belum ada</span>}</div>
      <DaftarPratinjau berkas={[{ kunci, label: judul, nama: berkas?.nama, path: berkas ? path : null }]} />
    </section>
  );
}

const TabelMatkul = ({ matkul }) => (
  <div className="tabel-wrap">
    <table>
      <thead><tr><th>No</th><th>Kode</th><th>Mata Kuliah</th><th>SKS Diakui</th><th>Keterangan</th></tr></thead>
      <tbody>
        {matkul.map((x, i) => <tr key={x.id_matkul}><td>{i + 1}</td><td>{x.kode_mk}</td><td>{x.nama_mk}</td><td>{x.sks_diakui}</td><td>{x.keterangan}</td></tr>)}
        <tr><td /><td /><td><strong>Total SKS</strong></td><td><strong>{matkul.reduce((t, x) => t + x.sks_diakui, 0)}</strong></td><td /></tr>
      </tbody>
    </table>
  </div>
);

export function DetailKonversiAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: k, error, muat } = useApi(`/admin/konversi/${id}`);
  const [alasan, setAlasan] = useState('');
  const [tolak, setTolak] = useState(false);
  const { sibuk, galat, jalan } = useAksi(muat);
  const periksa = (body) => jalan(() => api(`/admin/konversi/${id}/periksa`, { method: 'POST', body }), body.lengkap ? { judul: 'Berkas dinyatakan lengkap', teks: 'Lanjut ke pemetaan mata kuliah.' } : { judul: 'Pengajuan konversi ditolak', teks: 'Alasan penolakan dikirim ke mahasiswa.' });

  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!k) return <p className="sub">Memuat…</p>;
  const disetujui = ['diterbitkan', 'selesai'].includes(k.status);

  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">{disetujui ? 'Detail Hasil Konversi' : 'Detail Pemeriksaan Konversi SKS'}</h1>
        <p className="sub">Pengajuan {k.mahasiswa.nama} · {tanggalAngka(k.diajukan_pada)} · {k.nomor}</p>
      </header>
      <Link to="/admin/konversi" className="kembali">← Kembali ke daftar</Link>
      {galat && <p className="banner-galat" role="alert">{galat}</p>}
      {k.status === 'ditolak' && <p className="banner-galat" role="status"><strong>Pengajuan ditolak</strong>{k.alasan_penolakan} Mahasiswa dapat memperbaiki dan mengajukan ulang.</p>}

      <div className="dua-kolom-admin rata">
        <InfoMahasiswa k={k} />
        <InfoPerusahaan k={k} />
      </div>

      {disetujui ? (
        <div className="dua-kolom-admin">
          <section className="kartu">
            <div className="kartu-kepala"><h2>Hasil Pemetaan Mata Kuliah</h2><Status nilai={k.status} /></div>
            <TabelMatkul matkul={k.matkul} />
          </section>
          <div className="kolom-samping">
            <section className="kartu">
              <h2>Status Persetujuan</h2>
              <dl className="kv-polos satu-kolom">
                <div><dt>Tanggal persetujuan</dt><dd>{k.disetujui_pada ? tanggalPanjang(k.disetujui_pada) : '–'}</dd></div>
                <div><dt>Diperiksa oleh</dt><dd>{k.admin_pemeriksa ?? '–'}</dd></div>
                <div><dt>Nomor surat</dt><dd>{k.surat?.nomor_surat ?? '–'}</dd></div>
                <div><dt>Dosen pendamping</dt><dd>{k.dosen?.nama ?? <Link to={`/admin/penugasan/${k.id}`} className="aksi-kecil">Belum ditugaskan — Tugaskan</Link>}</dd></div>
              </dl>
            </section>
            {k.surat && (
              <section className="kartu">
                <h2>Preview Surat Konversi</h2>
                <div className="aksi-keputusan" style={{ marginTop: 0 }}>
                  <TautanBerkas className="btn isi" path={`/admin/konversi/${k.id}/surat`}>Preview Surat</TautanBerkas>
                  <button type="button" className="btn garis" onClick={() => unduhBerkas(`/admin/konversi/${k.id}/surat`, `${k.surat.nomor_surat.replaceAll('/', '-')}.pdf`)}>Unduh</button>
                </div>
              </section>
            )}
            <section className="kartu"><h2>Riwayat Perubahan Status</h2><RiwayatStatus item={k.riwayat.map((x) => ({ judul: { diajukan: 'Pengajuan dikirim mahasiswa', ditinjau: 'Berkas diperiksa', diproses: 'Pemetaan disetujui', diterbitkan: 'Konversi disetujui dan surat diterbitkan' }[x.status] ?? x.status, pada: x.pada }))} /></section>
          </div>
        </div>
      ) : (
        <>
          <div className="dua-kolom-admin rata">
            <KartuBerkas judul="Surat Penerimaan" kunci="sp" berkas={k.surat_penerimaan} path={`/admin/konversi/${k.id}/surat-penerimaan`} />
            <KartuBerkas judul="Silabus Magang" kunci="sil" berkas={k.silabus} path={`/admin/konversi/${k.id}/silabus`} />
          </div>
          <div className="dua-kolom-admin">
            <section className="kartu">
              <h2>Langkah Berikutnya</h2>
              {k.status === 'diajukan' && (
                <>
                  <p className="isi">Pastikan kedua berkas lengkap dan sesuai. Batas dua kali magang sudah diperiksa saat validasi surat rekomendasi.</p>
                  <div className="aksi-keputusan">
                    <button className="btn isi" disabled={sibuk || !k.surat_penerimaan || !k.silabus} onClick={async () => { if (await periksa({ lengkap: true })) navigate(`/admin/konversi/${id}/pemetaan`); }}>Lanjut ke Pemetaan Mata Kuliah</button>
                    <button className="btn garis bahaya" disabled={sibuk} onClick={() => setTolak(true)}>Tolak</button>
                  </div>
                </>
              )}
              {['ditinjau', 'diproses'].includes(k.status) && (
                <>
                  <p className="isi">Berkas sudah diperiksa. Petakan mata kuliah dan SKS yang diakui, lalu setujui konversi.</p>
                  <Link className="btn isi" style={{ marginTop: 12 }} to={`/admin/konversi/${id}/pemetaan`}>Lanjut ke Pemetaan Mata Kuliah</Link>
                </>
              )}
              {k.status === 'ditolak' && <p className="isi">Pengajuan ini sudah ditolak.</p>}
            </section>
            <Kuota kuota={k.kuota} />
          </div>
        </>
      )}

      {tolak && (
        <Dialog judul="Tolak Konversi" onTutup={() => setTolak(false)}>
          <form className="aksi-form" style={{ marginTop: 0 }} onSubmit={async (e) => { e.preventDefault(); await periksa({ lengkap: false, alasan }); setTolak(false); }}>
            <label>Alasan penolakan *
              <textarea rows={3} required minLength={5} maxLength={500} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Ditampilkan kepada mahasiswa" />
            </label>
            <div className="dialog-aksi">
              <button className="btn garis" type="button" onClick={() => setTolak(false)}>Batal</button>
              <button className="btn garis bahaya" type="submit" disabled={sibuk}>Tolak Konversi</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

// UI-14 "Pemetaan Mata Kuliah": kiri hasil pemetaan, kanan daftar mata kuliah prodi, lalu keputusan.
export function PemetaanKonversi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: k, error } = useApi(`/admin/konversi/${id}`);
  const { data: daftar } = useApi('/admin/mata-kuliah');
  const [baris, setBaris] = useState(null); // [{ id_matkul, sks_diakui, keterangan }] — terisi dari data server sekali
  const [alasan, setAlasan] = useState('');
  const [dialog, setDialog] = useState(null); // 'setuju' | 'tolak'
  const [tersimpan, setTersimpan] = useState(false);
  const { sibuk, galat, jalan } = useAksi();

  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!k || !daftar) return <p className="sub">Memuat…</p>;
  if (!['ditinjau', 'diproses'].includes(k.status)) return <div className="halaman"><p className="banner-info">Pemetaan hanya bisa diubah saat pengajuan sedang ditinjau. <Link to={`/admin/konversi/${id}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>Kembali ke detail</Link></p></div>;

  const awal = k.matkul.map((x) => ({ id_matkul: x.id_matkul, sks_diakui: x.sks_diakui, keterangan: x.keterangan }));
  const isi = baris ?? awal;
  const mk = (idm) => daftar.find((x) => x.id === idm);
  const total = isi.reduce((t, b) => t + (Number(b.sks_diakui) || 0), 0);
  const ubah = (fn) => { setBaris((prev) => fn(prev ?? awal)); setTersimpan(false); };
  const tambah = (m) => ubah((b) => [...b, { id_matkul: m.id, sks_diakui: m.sks, keterangan: '' }]);
  const simpan = () => api(`/admin/konversi/${id}/hasil`, { method: 'POST', body: { matkul: isi.map((b) => ({ id_matkul: b.id_matkul, sks_diakui: Number(b.sks_diakui), keterangan: b.keterangan })) } });

  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">Pemetaan Mata Kuliah</h1>
        <p className="sub">{k.mahasiswa.nama} · {k.nama_perusahaan}</p>
      </header>
      <Link to={`/admin/konversi/${id}`} className="kembali">← Kembali ke detail pemeriksaan</Link>
      {galat && <p className="banner-galat" role="alert">{galat}</p>}

      <div className="dua-kolom-admin">
        <div className="kolom-samping">
          <section className="kartu">
            <h2>Kegiatan Magang dan Silabus</h2>
            <dl className="kv-polos">
              <div><dt>Posisi / divisi</dt><dd>{k.posisi}</dd></div>
              <div><dt>Periode magang</dt><dd>{tanggalPanjang(k.tgl_mulai)} s.d. {tanggalPanjang(k.tgl_selesai)}</dd></div>
              <div className="lebar"><dt>Silabus</dt><dd>{k.silabus?.nama} <TautanBerkas className="btn garis kecil" path={`/admin/konversi/${k.id}/silabus`}>Preview</TautanBerkas></dd></div>
            </dl>
          </section>

          <section className="kartu">
            <h2>Hasil Pemetaan</h2>
            {isi.length === 0 ? <p className="kosong">Belum ada mata kuliah. Pilih dari daftar program studi di sebelah kanan.</p> : (
              <div className="tabel-wrap">
                <table>
                  <thead><tr><th>No</th><th>Kode</th><th>Mata Kuliah</th><th>SKS</th><th>Keterangan</th><th><span className="sr">Hapus</span></th></tr></thead>
                  <tbody>
                    {isi.map((b, i) => {
                      const m = mk(b.id_matkul);
                      return (
                        <tr key={b.id_matkul}>
                          <td>{i + 1}</td><td>{m?.kode_mk}</td><td>{m?.nama_mk}</td>
                          <td style={{ width: 90 }}><input type="number" min="1" max={m?.sks} value={b.sks_diakui} aria-label={`SKS diakui ${m?.kode_mk}`} onChange={(e) => ubah((x) => x.map((y, j) => (j === i ? { ...y, sks_diakui: e.target.value } : y)))} /></td>
                          <td style={{ minWidth: 170 }}><input maxLength={200} placeholder="Keterangan bawaan templat" value={b.keterangan} aria-label={`Keterangan ${m?.kode_mk}`} onChange={(e) => ubah((x) => x.map((y, j) => (j === i ? { ...y, keterangan: e.target.value } : y)))} /></td>
                          <td><button type="button" className="btn garis kecil bahaya" onClick={() => ubah((x) => x.filter((_, j) => j !== i))}>Hapus</button></td>
                        </tr>
                      );
                    })}
                    <tr><td /><td /><td><strong>Total SKS</strong></td><td><strong>{total}</strong></td><td colSpan={2}><span className="catatan-kecil" style={{ margin: 0 }}>Dihitung otomatis</span></td></tr>
                  </tbody>
                </table>
              </div>
            )}
            <div className="baris-aksi">
              <span className="catatan-kecil" style={{ margin: 0 }}>Mahasiswa tidak dapat mengubah hasil pemetaan yang ditetapkan Admin.</span>
              <button className="btn isi" disabled={sibuk || isi.length === 0} onClick={() => jalan(async () => { await simpan(); setTersimpan(true); }, { judul: 'Pemetaan tersimpan' })}>{tersimpan ? 'Tersimpan ✓' : 'Simpan Pemetaan'}</button>
            </div>
          </section>
        </div>

        <div className="kolom-samping">
          <section className="kartu">
            <div className="kartu-kepala"><h2>Daftar Mata Kuliah Program Studi</h2><Link to="/admin/mata-kuliah" className="aksi-kecil">Kelola</Link></div>
            {daftar.length === 0 ? <p className="banner-peringatan"><strong>Belum ada mata kuliah</strong><Link to="/admin/mata-kuliah" style={{ fontWeight: 600, textDecoration: 'underline' }}>Tambahkan di Mata Kuliah</Link></p> : (
              <div className="tabel-wrap">
                <table>
                  <thead><tr><th>Kode</th><th>Mata Kuliah</th><th>SKS</th><th><span className="sr">Tambah</span></th></tr></thead>
                  <tbody>
                    {daftar.map((m) => (
                      <tr key={m.id}>
                        <td>{m.kode_mk}</td><td>{m.nama_mk}</td><td>{m.sks}</td>
                        <td><button type="button" className="btn garis kecil" disabled={isi.some((b) => b.id_matkul === m.id)} onClick={() => tambah(m)}>Tambah</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <Kuota kuota={k.kuota} />

          <section className="kartu">
            <h2>Keputusan</h2>
            <div className="aksi-keputusan">
              <button className="btn isi" disabled={sibuk || isi.length === 0} onClick={() => setDialog('setuju')}>Setujui Konversi</button>
              <button className="btn garis bahaya" disabled={sibuk} onClick={() => setDialog('tolak')}>Tolak Konversi</button>
            </div>
          </section>
        </div>
      </div>

      {dialog === 'setuju' && (
        <Dialog judul="Konfirmasi Persetujuan Konversi" onTutup={() => setDialog(null)}>
          <p className="isi">Konversi <strong>{total} SKS</strong> untuk {k.mahasiswa.nama} akan disetujui dan surat keterangan konversi langsung diterbitkan. Tindakan ini tidak dapat dibatalkan.</p>
          <div className="dialog-aksi">
            <button className="btn garis" onClick={() => setDialog(null)}>Batal</button>
            <button className="btn isi" disabled={sibuk} onClick={() => jalan(async () => { await simpan(); await api(`/admin/konversi/${id}/setujui`, { method: 'POST' }); navigate(`/admin/konversi/${id}`); }, { judul: 'Konversi disetujui', teks: 'Surat konversi sudah diterbitkan.' })}>{sibuk ? 'Menerbitkan…' : 'Setujui Konversi'}</button>
          </div>
        </Dialog>
      )}
      {dialog === 'tolak' && (
        <Dialog judul="Tolak Konversi" onTutup={() => setDialog(null)}>
          <form className="aksi-form" style={{ marginTop: 0 }} onSubmit={(e) => { e.preventDefault(); jalan(async () => { await api(`/admin/konversi/${id}/tolak`, { method: 'POST', body: { alasan } }); navigate(`/admin/konversi/${id}`); }, { judul: 'Pengajuan konversi ditolak', teks: 'Alasan penolakan dikirim ke mahasiswa.' }); }}>
            <label>Alasan penolakan *
              <textarea rows={3} required minLength={5} maxLength={500} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Ditampilkan kepada mahasiswa" />
            </label>
            <div className="dialog-aksi">
              <button className="btn garis" type="button" onClick={() => setDialog(null)}>Batal</button>
              <button className="btn garis bahaya" type="submit" disabled={sibuk}>Tolak Konversi</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
