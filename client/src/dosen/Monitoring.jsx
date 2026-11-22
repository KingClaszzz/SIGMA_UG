// PERAN: DOSEN PENDAMPING — monitoring dan pemeriksaan dokumen akhir per jenis (FR-14) serta pengesahan laporan akhir (FR-15).
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useAksi, useApi } from '../api';
import Badge from '../components/Badge.jsx';
import Dialog from '../components/Dialog.jsx';
import TautanBerkas from '../components/Berkas.jsx';
import DaftarPratinjau from '../components/Pratinjau.jsx';
import RiwayatStatus from '../components/RiwayatStatus.jsx';
import { tanggalAngka, tanggalPanjang } from '../format';

const TAB = [['logbook', 'Logbook'], ['laporan_akhir', 'Laporan Akhir'], ['sertifikat', 'Sertifikat'], ['nilai_mitra', 'Nilai Akhir Mitra']];
const STATUS = [['belum_diunggah', 'Belum Dikumpulkan'], ['menunggu', 'Menunggu Pemeriksaan'], ['perlu_perbaikan', 'Perlu Perbaikan'], ['menunggu_ulang', 'Menunggu Pemeriksaan Ulang'], ['disetujui', 'Disetujui']];
const NAMA_STATUS = { ...Object.fromEntries(STATUS), belum_diunggah: 'Belum Dikumpulkan' };
const StatusDok = ({ nilai }) => <Badge nilai={nilai} label={NAMA_STATUS[nilai]} />;

export function DaftarMonitoring() {
  const [jenis, setJenis] = useState('logbook');
  const [cari, setCari] = useState('');
  const [status, setStatus] = useState('semua');
  const { data, error } = useApi(`/dosen/monitoring?jenis=${jenis}&q=${encodeURIComponent(cari)}&status=${status}`);
  return (
    <div className="halaman admin-lebar">
      <header className="halaman-kepala masuk">
        <div>
          <h1 className="judul">Monitoring Magang</h1>
          <p className="sub">Periksa dan pantau dokumen magang mahasiswa bimbingan Anda.</p>
        </div>
        <Link to="/dosen/riwayat" className="btn garis">Riwayat Monitoring</Link>
      </header>
      <section className="kartu">
        <div className="alat-tabel">
          <label style={{ flex: '1 1 320px' }}>Cari mahasiswa
            <input type="search" placeholder="contoh: Zaki atau 10122001" value={cari} onChange={(e) => setCari(e.target.value)} />
          </label>
          <label>Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="semua">Semua</option>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
        </div>
        <div className="tab-garis" role="tablist">
          {TAB.map(([k, label]) => <button key={k} role="tab" aria-selected={jenis === k} className={jenis === k ? 'aktif' : ''} onClick={() => setJenis(k)}>{label}</button>)}
        </div>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <p className="kosong">Memuat…</p> : data.length === 0 ? <p className="kosong">Tidak ada data yang cocok.</p> : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>No</th><th>Nama Mahasiswa</th><th>NPM</th><th>Perusahaan</th><th>{jenis === 'logbook' ? 'Logbook' : 'Nama File'}</th><th>Tanggal Pengumpulan</th><th>Status</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((x, i) => (
                  <tr key={x.id}>
                    <td>{i + 1}</td><td>{x.nama}</td><td>{x.npm}</td><td>{x.nama_perusahaan}</td>
                    <td>{x.nama_berkas ?? (x.status === 'belum_diunggah' ? '–' : 'Ringkasan tertulis')}</td>
                    <td>{x.diunggah_pada ? tanggalAngka(x.diunggah_pada) : '–'}</td>
                    <td><StatusDok nilai={x.status} /></td>
                    <td><Link className="btn garis kecil" to={`/dosen/monitoring/${x.id}/${jenis}`}>Detail</Link></td>
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

export function DetailDokumen() {
  const { id, jenis } = useParams();
  const { data: d, error, muat } = useApi(`/dosen/monitoring/${id}/${jenis}`);
  const [dialog, setDialog] = useState(null); // 'setuju' | 'perbaikan' | 'ttd'
  const [catatan, setCatatan] = useState('');
  const [batas, setBatas] = useState('');
  const input = useRef(null);
  const { sibuk, galat, jalan } = useAksi(muat);

  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!d) return <p className="sub">Memuat…</p>;
  const laporan = jenis === 'laporan_akhir';
  const periksa = (body, pesan) => jalan(async () => { await api(`/dosen/bimbingan/${id}/dokumen/${jenis}/periksa`, { method: 'POST', body }); setDialog(null); setCatatan(''); setBatas(''); }, pesan);
  const tutup = () => setDialog(null);
  const ttd = d.ttd;

  return (
    <div className="halaman admin-lebar">
      <Link to="/dosen/monitoring" className="kembali">← Kembali ke Monitoring Magang</Link>
      <section className="kartu profil-kepala masuk">
        <div style={{ flex: 1 }}>
          <h1 className="judul" style={{ fontSize: 20 }}>{d.mahasiswa.nama} · {d.mahasiswa.npm}</h1>
          <p className="sub">Sistem Informasi · {d.nama_perusahaan} · {tanggalPanjang(d.tgl_mulai)} s.d. {tanggalPanjang(d.tgl_selesai)}</p>
        </div>
        <StatusDok nilai={d.status} />
      </section>
      {galat && <p className="banner-galat" role="alert">{galat}</p>}

      <div className="dua-kolom-admin">
        <div className="kolom-samping">
          <section className="kartu">
            <h2>{laporan ? 'Informasi File Laporan' : `Detail ${d.label}`}</h2>
            <dl className="kv-polos">
              <div><dt>Tanggal pengiriman</dt><dd>{d.diunggah_pada ? tanggalAngka(d.diunggah_pada) : '–'}</dd></div>
              <div><dt>Pemeriksaan terakhir</dt><dd>{d.diperiksa_pada ? tanggalAngka(d.diperiksa_pada) : '–'}</dd></div>
            </dl>
            {d.ringkasan && <p className="isi" style={{ marginTop: 12, whiteSpace: 'pre-line' }}><strong>{jenis === 'logbook' ? 'Isi logbook:' : 'Ringkasan kegiatan:'}</strong> {d.ringkasan}</p>}
            {d.status === 'belum_diunggah' && <p className="kosong" style={{ marginTop: 12 }}>Mahasiswa belum mengumpulkan dokumen ini.</p>}
            {d.ada_berkas && <DaftarPratinjau berkas={[{ kunci: d.jenis, label: d.label, nama: d.nama_berkas, path: `/dosen/bimbingan/${id}/dokumen/${jenis}` }]} />}
          </section>
          <section className="kartu">
            <h2>Riwayat</h2>
            {d.riwayat.length === 0 ? <p className="kosong">Belum ada riwayat.</p> : <RiwayatStatus item={d.riwayat} />}
          </section>
        </div>

        <div className="kolom-samping">
          <section className="kartu">
            <div className="kartu-kepala"><h2>Pemeriksaan</h2><StatusDok nilai={d.status} /></div>
            {d.catatan_dosen && <p className="banner-peringatan" style={{ marginTop: 10 }}><strong>Catatan pemeriksaan</strong>{d.catatan_dosen}{d.batas_revisi ? ` Batas revisi: ${tanggalAngka(d.batas_revisi)}.` : ''}</p>}
            {['menunggu', 'menunggu_ulang'].includes(d.status) ? (
              <div className="aksi-keputusan">
                <button className="btn isi" disabled={sibuk} style={{ background: '#1f7a45' }} onClick={() => setDialog('setuju')}>Setujui {d.label}</button>
                <button className="btn garis bahaya" disabled={sibuk} onClick={() => setDialog('perbaikan')}>Minta Perbaikan</button>
              </div>
            ) : <p className="catatan-kecil">{d.status === 'disetujui' ? 'Dokumen sudah disetujui.' : d.status === 'perlu_perbaikan' ? 'Menunggu mahasiswa mengunggah revisi.' : 'Belum ada yang bisa diperiksa.'}</p>}
          </section>

          {laporan && d.status === 'disetujui' && (ttd.ada ? (
            <section className="kartu">
              <div className="kartu-kepala"><h2>Laporan Ditandatangani</h2><span className="badge hijau">Selesai</span></div>
              <p className="isi">Ditandatangani pada {tanggalPanjang(ttd.pada)}. Mahasiswa dapat mengunduh laporan bertanda tangan ini.</p>
              <TautanBerkas className="btn isi" style={{ marginTop: 12 }} path={`/dosen/bimbingan/${id}/laporan/ttd`}>Lihat Laporan Bertanda Tangan</TautanBerkas>
            </section>
          ) : (
            <>
              <section className="kartu">
                <h2>Tandatangani Laporan Digital</h2>
                <dl className="kv-polos satu-kolom">
                  <div><dt>Nama</dt><dd>{d.penandatangan.nama}</dd></div><div><dt>Jabatan</dt><dd>{d.penandatangan.jabatan}</dd></div>
                  <div><dt>Program studi</dt><dd>{d.penandatangan.prodi}</dd></div><div><dt>Tanggal tanda tangan</dt><dd>{tanggalPanjang(new Date().toISOString())}</dd></div>
                </dl>
                <button className="btn isi" style={{ marginTop: 12 }} disabled={sibuk} onClick={() => setDialog('ttd')}>Tanda Tangani Laporan</button>
              </section>
              <section className="kartu">
                <h2>Alternatif di Luar Sistem</h2>
                <p className="isi">Bila Anda menandatangani laporan secara manual, unggah PDF yang sudah bertanda tangan. PDF itu dikirim kembali ke mahasiswa.</p>
                <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) jalan(() => api(`/dosen/bimbingan/${id}/laporan/ttd-unggah`, { method: 'POST', berkas: f }), { judul: 'Laporan bertanda tangan diunggah', teks: 'Mahasiswa dapat mengunduhnya.' }); }} />
                <button className="btn garis" style={{ marginTop: 12 }} disabled={sibuk} onClick={() => input.current.click()}>Unggah PDF Bertanda Tangan</button>
              </section>
            </>
          ))}
        </div>
      </div>

      {dialog === 'setuju' && (
        <Dialog judul="Setujui Dokumen?" onTutup={tutup}>
          <p className="isi">Apakah Anda yakin ingin menyetujui {d.label} milik {d.mahasiswa.nama}?</p>
          <div className="dialog-aksi">
            <button className="btn garis" onClick={tutup}>Batal</button>
            <button className="btn isi" style={{ background: '#1f7a45' }} disabled={sibuk} onClick={() => periksa({ setuju: true }, { judul: 'Dokumen disetujui', teks: d.label })}>Ya, Setujui</button>
          </div>
        </Dialog>
      )}
      {dialog === 'perbaikan' && (
        <Dialog judul="Berikan Catatan Perbaikan" onTutup={tutup}>
          <form className="aksi-form" style={{ marginTop: 0 }} onSubmit={(e) => { e.preventDefault(); periksa({ setuju: false, catatan, batas_revisi: batas || undefined }, { jenis: 'info', judul: 'Perbaikan diminta', teks: 'Catatan dikirim ke mahasiswa.' }); }}>
            <label>Catatan *<textarea rows={4} required minLength={5} maxLength={500} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Bagian yang perlu diperbaiki" /></label>
            <label>Batas revisi (opsional)<input type="date" min={new Date().toISOString().slice(0, 10)} value={batas} onChange={(e) => setBatas(e.target.value)} /></label>
            <div className="dialog-aksi">
              <button className="btn garis" type="button" onClick={tutup}>Batal</button>
              <button className="btn isi" type="submit" disabled={sibuk} style={{ background: '#c62828' }}>Kirim Catatan</button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === 'ttd' && (
        <Dialog judul="Tanda Tangani Laporan?" onTutup={tutup}>
          <p className="isi">Laporan yang sudah disetujui akan disahkan secara digital atas nama {d.penandatangan.nama} lalu dikirim kembali ke mahasiswa. Tindakan ini tidak dapat dibatalkan.</p>
          <div className="dialog-aksi">
            <button className="btn garis" onClick={tutup}>Batal</button>
            <button className="btn isi" disabled={sibuk} onClick={async () => { await jalan(() => api(`/dosen/bimbingan/${id}/laporan/tanda-tangan`, { method: 'POST' }), { judul: 'Laporan ditandatangani', teks: 'Mahasiswa dapat mengunduh laporan bertanda tangan.' }); setDialog(null); }}>Ya, Tandatangani</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export function RiwayatMonitoring() {
  const { data, error } = useApi('/dosen/riwayat');
  return (
    <div className="halaman admin-lebar">
      <Link to="/dosen/monitoring" className="kembali">← Kembali ke Monitoring Magang</Link>
      <header className="masuk">
        <h1 className="judul">Riwayat Monitoring</h1>
        <p className="sub">Semua pengiriman dan pemeriksaan dokumen mahasiswa bimbingan Anda.</p>
      </header>
      <section className="kartu">
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <p className="kosong">Memuat…</p> : data.length === 0 ? <p className="kosong">Belum ada riwayat.</p> : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Waktu</th><th>Mahasiswa</th><th>Aktivitas</th><th>Oleh</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((x, i) => (
                  <tr key={i}>
                    <td>{tanggalAngka(x.pada)}</td><td>{x.mahasiswa}<small className="kecil-abu">{x.npm}</small></td>
                    <td>{x.judul}{x.catatan && <small className="kecil-abu">{x.catatan}</small>}</td><td>{x.oleh ?? '–'}</td>
                    <td><Link className="btn garis kecil" to={`/dosen/monitoring/${x.id}/${x.jenis}`}>Detail</Link></td>
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
