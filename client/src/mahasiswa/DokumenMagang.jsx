import Muat from '../components/Muat.jsx';
// PERAN: MAHASISWA (FR-12, FR-13). Dokumen diperiksa dosen pendamping (src/dosen/); status dan catatannya tampil di sini.
import { beritahu } from '../components/Pemberitahuan.jsx';
import TautanBerkas from '../components/Berkas.jsx';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, unduhBerkas, useApi } from '../api';
import Badge from '../components/Badge.jsx';
import Tabs from '../components/Tabs.jsx';
import Upload from '../components/Upload.jsx';
import { rentang, sisaHari, tanggalAngka, tanggalPanjang } from '../format';
import './mahasiswa.css';

const TAB = [
  ['/dokumen-magang', 'Ringkasan', true],
  ['/dokumen-magang/logbook', 'Logbook'],
  ['/dokumen-magang/laporan-akhir', 'Laporan Akhir'],
  ['/dokumen-magang/dokumen-mitra', 'Dokumen Mitra'],
  ['/dokumen-magang/monitoring', 'Monitoring'],
];
const TAUTAN = { logbook: 'logbook', laporan_akhir: 'laporan-akhir', nilai_mitra: 'dokumen-mitra', sertifikat: 'dokumen-mitra' };
const SUB = {
  ringkasan: 'Kumpulkan dan pantau logbook, laporan akhir, nilai mitra, dan sertifikat magang Anda.',
  logbook: 'Unggah logbook magang (opsional, PDF maksimal 2 MB).',
  'laporan-akhir': 'Unggah laporan akhir yang sudah ditandatangani dosen pendamping dan mitra.',
  'dokumen-mitra': 'Unggah nilai akhir dari mitra dan sertifikat magang.',
  monitoring: 'Pantau status pemeriksaan seluruh dokumen Anda.',
};

const dok = (data, jenis) => data.dokumen.find((x) => x.jenis === jenis);

// Satu dokumen PDF: status pemeriksaan, catatan dosen, dan area unggah.
function BlokDokumen({ data, jenis, petunjuk, muat }) {
  const d = dok(data, jenis);
  const terkunci = d.status === 'disetujui' || data.batas_lewat;
  return (
    <section className="kartu masuk">
      <div className="kartu-kepala">
        <h2>{d.label}</h2>
        <Badge nilai={d.status} />
      </div>
      <p className="isi" style={{ margin: '6px 0 14px' }}>{petunjuk}</p>
      {d.status === 'perlu_perbaikan' && <p className="banner-galat" role="status" style={{ marginBottom: 14 }}><strong>Perlu perbaikan</strong>{d.catatan_dosen ?? 'Dosen pendamping meminta dokumen ini diperbaiki.'}{d.batas_revisi ? ` Batas revisi: ${tanggalAngka(d.batas_revisi)}.` : ''}</p>}
      {d.status === 'disetujui' && <p className="banner-ok" role="status" style={{ marginBottom: 14 }}>Dokumen sudah disetujui dan tidak dapat diganti.</p>}
      {d.menunggu_ulang && <p className="banner-info" role="status" style={{ marginBottom: 14 }}>Revisi Anda sudah dikirim dan menunggu pemeriksaan ulang dosen pendamping.</p>}
      {d.ada_ttd && <p className="banner-ok" role="status" style={{ marginBottom: 14 }}><strong>Laporan sudah ditandatangani dosen pendamping</strong><TautanBerkas className="btn isi kecil" style={{ marginTop: 8 }} path="/mahasiswa/dokumen-magang/laporan_akhir/ttd">Unduh Laporan Bertanda Tangan</TautanBerkas></p>}
      {data.batas_lewat && d.status !== 'disetujui' && <p className="banner-peringatan" role="status" style={{ marginBottom: 14 }}>Batas pengumpulan sudah lewat ({tanggalPanjang(data.batas_laporan)}). Hubungi Admin Prodi.</p>}
      <Upload
        berkas={d.berkas}
        tautan={`/mahasiswa/dokumen-magang/${jenis}/berkas`}
        terkunci={terkunci}
        onPilih={async (file) => { await api(`/mahasiswa/dokumen-magang/${jenis}`, { method: 'POST', berkas: file }); await muat(); beritahu({ judul: 'Dokumen terunggah', teks: 'Menunggu pemeriksaan dosen pendamping.' }); }}
      />
    </section>
  );
}

function Logbook({ data, muat }) {
  return <BlokDokumen data={data} jenis="logbook" muat={muat} petunjuk="Logbook bersifat opsional. Unggah logbook sesuai format perusahaan tempat Anda magang (PDF, maksimal 2 MB)." />;
}

function LaporanAkhir({ data, muat }) {
  const d = dok(data, 'laporan_akhir');
  const [galat, setGalat] = useState(null);
  return (
    <div className="dua-kolom">
      <div className="kolom-samping" style={{ gap: 20 }}>
        <section className="kartu masuk">
          <h2>Template Laporan Akhir</h2>
          <p className="isi" style={{ margin: '6px 0 12px' }}>Gunakan template laporan akhir dari prodi agar format sesuai ketentuan.</p>
          {data.template_laporan_tersedia
            ? <button type="button" className="btn keras kecil" onClick={() => unduhBerkas('/mahasiswa/dokumen-magang/laporan_akhir/template', data.template_laporan_nama).catch((e) => setGalat(e.message))}>Unduh Template Laporan Akhir</button>
            : <span className="badge kuning">Belum disediakan prodi</span>}
          {galat && <p className="pesan galat" role="alert">{galat}</p>}
        </section>
        <BlokDokumen data={data} jenis="laporan_akhir" muat={muat} petunjuk="Unggah laporan akhir magang (PDF, maksimal 2 MB). Dosen pendamping memeriksa lalu mengesahkannya." />
      </div>
      <section className="kartu masuk">
        <h2>Status Tanda Tangan</h2>
        <dl className="kv-grid" style={{ marginTop: 12 }}>
          <div className="kv"><dt>Penandatangan</dt><dd>{data.dosen_pendamping ?? 'Belum ditetapkan'}</dd></div>
          <div className="kv"><dt>Status</dt><dd>{d.ada_ttd ? <span className="badge hijau">Sudah Ditandatangani</span> : <span className="badge merah">Belum Ditandatangani</span>}</dd></div>
          {d.ditandatangani_pada && <div className="kv"><dt>Tanggal</dt><dd>{tanggalAngka(d.ditandatangani_pada)}</dd></div>}
        </dl>
        <p className="catatan-kecil">Dosen mengesahkan laporan setelah laporan Anda disetujui.</p>
      </section>
    </div>
  );
}

function Ringkasan({ data }) {
  const batas = data.batas_laporan;
  const sisa = batas ? sisaHari(batas) : null;
  return (
    <>
      <dl className="kv-grid masuk">
        <div className="kartu kv-kartu"><dt>Perusahaan magang</dt><dd>{data.perusahaan}</dd></div>
        <div className="kartu kv-kartu"><dt>Dosen pendamping</dt><dd>{data.dosen_pendamping ?? 'Belum ditetapkan'}</dd></div>
        <div className="kartu kv-kartu"><dt>Periode magang</dt><dd>{rentang(data.tgl_mulai, data.tgl_selesai)}</dd></div>
      </dl>
      <div className="dua-kolom berat-kiri">
        <section className="kartu masuk">
          <div className="kartu-kepala"><h2>Progres Pengumpulan Dokumen</h2><span className="stat-label">{data.wajib_disetujui} dari {data.wajib_total} dokumen wajib disetujui</span></div>
          <div className="progres" role="progressbar" aria-valuenow={data.wajib_disetujui} aria-valuemax={data.wajib_total}><span style={{ width: `${(data.wajib_disetujui / data.wajib_total) * 100}%` }} /></div>
        </section>
        <div className={`deadline masuk${sisa !== null && sisa < 0 ? ' lewat' : ''}`}>
          Deadline pengumpulan
          <strong>{batas ? `${tanggalAngka(batas)} · ${sisa < 0 ? 'sudah lewat' : sisa === 0 ? 'hari ini' : `sisa ${sisa} hari`}` : 'Belum ditetapkan Admin Prodi'}</strong>
        </div>
      </div>
      <div className="ringkas-grid">
        {data.dokumen.map((d, i) => (
          <section key={d.jenis} className="kartu kartu-dok masuk" style={{ '--urut': i + 2 }}>
            <h3>{d.label.replace(' (Bertanda Tangan)', '')}{!d.wajib && <small style={{ fontWeight: 400 }}> (opsional)</small>}</h3>
            <div><Badge nilai={d.status} /></div>
            <Link className="tautan" to={`/dokumen-magang/${TAUTAN[d.jenis]}`}>Buka {d.label.replace(' (Bertanda Tangan)', '')} →</Link>
          </section>
        ))}
      </div>
    </>
  );
}

function Monitoring({ data }) {
  return (
    <>
      {data.selesai ? (
        <section className="kartu selesai-kartu masuk">
          <span className="modal-ikon">✓</span>
          <h2>Pengumpulan Dokumen Magang Selesai</h2>
          <p className="isi">Seluruh dokumen wajib telah dikumpulkan dan diperiksa. Tanggal penyelesaian: <strong>{tanggalPanjang(data.tanggal_selesai)}</strong></p>
        </section>
      ) : (
        <p className="banner-info masuk" role="status"><strong>Pengumpulan dokumen belum selesai</strong>{data.wajib_disetujui} dari {data.wajib_total} dokumen wajib sudah disetujui dosen pendamping.</p>
      )}
      <section className="kartu masuk">
        <h2>Ringkasan Dokumen</h2>
        <div className="tabel-wrap">
          <table>
            <thead><tr><th>Dokumen</th><th>Pemeriksa</th><th>Tanggal</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead>
            <tbody>
              {data.dokumen.map((d) => (
                <tr key={d.jenis}>
                  <td>{d.label}</td>
                  <td>{d.pemeriksa ?? data.dosen_pendamping ?? '–'}</td>
                  <td>{d.diperiksa_pada ? tanggalAngka(d.diperiksa_pada) : d.diunggah_pada ? tanggalAngka(d.diunggah_pada) : '–'}</td>
                  <td><Badge nilai={d.status} label={d.menunggu_ulang ? 'Menunggu pemeriksaan ulang' : undefined} /></td>
                  <td>{d.catatan_dosen ?? '–'}</td>
                  <td>{d.berkas ? <TautanBerkas className="btn garis kecil" path={`/mahasiswa/dokumen-magang/${d.jenis}/berkas`}>{d.jenis === 'laporan_akhir' && d.status === 'disetujui' ? 'Unduh' : 'Lihat'}</TautanBerkas> : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function DokumenMagang() {
  const { tab = 'ringkasan' } = useParams();
  const { data, error, muat } = useApi('/mahasiswa/dokumen-magang');

  const isi = !data ? <Muat /> : !data.ada_magang ? (
    <section className="kartu masuk">
      <h2>Belum ada magang yang berjalan</h2>
      <p className="isi" style={{ margin: '6px 0 14px' }}>Dokumen magang dapat dikumpulkan setelah pengajuan konversi SKS Anda dikirim.</p>
      <Link className="btn isi" to="/konversi-sks">Ke Konversi SKS</Link>
    </section>
  ) : {
    ringkasan: <Ringkasan data={data} />,
    logbook: <Logbook data={data} muat={muat} />,
    'laporan-akhir': <LaporanAkhir data={data} muat={muat} />,
    'dokumen-mitra': (
      <>
        <BlokDokumen data={data} jenis="nilai_mitra" muat={muat} petunjuk="Unggah nilai atau rangkuman penilaian akhir dari mitra, terpisah dari laporan akhir." />
        <BlokDokumen data={data} jenis="sertifikat" muat={muat} petunjuk="Unggah sertifikat magang dari perusahaan." />
      </>
    ),
    monitoring: <Monitoring data={data} />,
  }[tab];

  return (
    <div className="halaman">
      <header className="masuk">
        <h1 className="judul">Dokumen Magang</h1>
        <p className="sub">{SUB[tab] ?? SUB.ringkasan}</p>
      </header>
      <Tabs items={TAB} />
      {error ? <p className="pesan galat" role="alert">{error.message}</p> : isi ?? <p className="kosong">Halaman tidak ditemukan.</p>}
    </div>
  );
}
