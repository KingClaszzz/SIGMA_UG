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
  logbook: 'Catat kegiatan magang Anda. Dosen pendamping memantau logbook ini.',
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

const ENTRI_KOSONG = { tanggal: '', jam_mulai: '09:00', jam_selesai: '17:00', aktivitas: '', hasil: '', kendala: '' };

// Metode 1 (Figma "Pengisian Logbook"): entri harian di sistem. "Kirim Logbook" merangkum semua entri jadi dokumen logbook untuk dosen.
function Logbook({ data, muat }) {
  const d = dok(data, 'logbook');
  const { data: lb, muat: muatLb } = useApi('/mahasiswa/logbook');
  const [form, setForm] = useState(ENTRI_KOSONG);
  const [ubahId, setUbahId] = useState(null);
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const terkunci = d.status === 'disetujui' || data.batas_lewat;
  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function jalan(fn, pesan) {
    setGalat(null);
    setSibuk(true);
    try {
      await fn();
      if (pesan) beritahu(pesan);
    } catch (e) {
      setGalat(e.message);
    } finally {
      setSibuk(false);
    }
  }
  const simpan = (e) => {
    e.preventDefault();
    jalan(async () => {
      await api(ubahId ? `/mahasiswa/logbook/${ubahId}` : '/mahasiswa/logbook', { method: ubahId ? 'PUT' : 'POST', body: form });
      setForm(ENTRI_KOSONG);
      setUbahId(null);
      await muatLb();
    }, { judul: ubahId ? 'Entri logbook diperbarui' : 'Entri logbook tersimpan', teks: 'Kirim logbook ke dosen setelah semua entri siap.' });
  };
  const kirim = () => jalan(async () => { await api('/mahasiswa/logbook/kirim', { method: 'POST' }); await muat(); }, { judul: 'Logbook terkirim', teks: 'Menunggu pemeriksaan dosen pendamping.' });
  const hapus = (id) => jalan(async () => { await api(`/mahasiswa/logbook/${id}`, { method: 'DELETE' }); await muatLb(); });
  const edit = (x) => { setUbahId(x.id); setForm({ tanggal: x.tanggal, jam_mulai: x.jam_mulai, jam_selesai: x.jam_selesai, aktivitas: x.aktivitas, hasil: x.hasil, kendala: x.kendala ?? '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const entri = lb?.entri ?? [];

  return (
    <>
      <section className="kartu masuk">
        <div className="kartu-kepala"><h2>Status Logbook</h2><Badge nilai={d.status} label={d.menunggu_ulang ? 'Menunggu pemeriksaan ulang' : undefined} /></div>
        <p className="catatan-kecil" style={{ marginTop: 6 }}>Logbook bersifat opsional. Isi di sistem (metode 1) atau unggah dari perusahaan (metode 2). Dosen pendamping memeriksa logbook yang Anda kirim.</p>
        {d.status === 'perlu_perbaikan' && <p className="banner-galat" role="status" style={{ marginTop: 12 }}><strong>Perlu perbaikan</strong>{d.catatan_dosen}{d.batas_revisi ? ` Batas revisi: ${tanggalAngka(d.batas_revisi)}.` : ''}</p>}
        {d.status === 'disetujui' && <p className="banner-ok" role="status" style={{ marginTop: 12 }}>Logbook sudah disetujui dan tidak dapat diubah.</p>}
      </section>

      <div className="dua-kolom">
        <form className="kartu masuk" onSubmit={simpan}>
          <h2>Metode 1 · Isi Logbook di Sistem</h2>
          <div className="grid-form" style={{ marginTop: 12 }}>
            <label>Tanggal kegiatan *<input type="date" required disabled={terkunci} min={lb?.tgl_mulai} max={lb?.tgl_selesai && lb.tgl_selesai < new Date().toISOString().slice(0, 10) ? lb.tgl_selesai : new Date().toISOString().slice(0, 10)} value={form.tanggal} onChange={ubah('tanggal')} /></label>
            <div className="grid-form" style={{ gap: 12 }}>
              <label>Jam mulai *<input type="time" required disabled={terkunci} value={form.jam_mulai} onChange={ubah('jam_mulai')} /></label>
              <label>Jam selesai *<input type="time" required disabled={terkunci} value={form.jam_selesai} onChange={ubah('jam_selesai')} /></label>
            </div>
            <label className="penuh">Deskripsi aktivitas *<textarea rows={3} required maxLength={1000} disabled={terkunci} value={form.aktivitas} onChange={ubah('aktivitas')} placeholder="Apa yang Anda kerjakan hari ini" /></label>
            <label className="penuh">Hasil / pencapaian *<textarea rows={3} required maxLength={1000} disabled={terkunci} value={form.hasil} onChange={ubah('hasil')} /></label>
            <label className="penuh">Kendala (opsional)<textarea rows={2} maxLength={500} disabled={terkunci} value={form.kendala} onChange={ubah('kendala')} /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="baris-aksi">
            {ubahId ? <button type="button" className="btn garis" onClick={() => { setUbahId(null); setForm(ENTRI_KOSONG); }}>Batal Ubah</button> : <span />}
            <button className="btn kuning" type="submit" disabled={terkunci || sibuk}>{ubahId ? 'Simpan Perubahan' : 'Simpan Entri'}</button>
          </div>
        </form>

        <section className="kartu masuk">
          <h2>Entri Tersimpan <span className="pil">{entri.length}</span></h2>
          {entri.length === 0 ? <p className="kosong" style={{ marginTop: 10 }}><strong>Belum ada entri</strong><br />Entri yang Anda simpan muncul di sini.</p> : (
            <ul className="entri-logbook">
              {entri.map((x) => (
                <li key={x.id}>
                  <strong>{tanggalAngka(x.tanggal)} · {x.jam_mulai}–{x.jam_selesai}</strong>
                  <p>{x.aktivitas}</p>
                  <small>Hasil: {x.hasil}{x.kendala ? ` · Kendala: ${x.kendala}` : ''}</small>
                  {!terkunci && <span className="entri-aksi"><button type="button" className="aksi-kecil" onClick={() => edit(x)}>Ubah</button><button type="button" className="aksi-kecil" onClick={() => hapus(x.id)}>Hapus</button></span>}
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn isi" style={{ marginTop: 14, width: '100%' }} disabled={terkunci || sibuk || entri.length === 0} onClick={kirim}>{d.status === 'perlu_perbaikan' ? 'Kirim Ulang Logbook' : 'Kirim Logbook ke Dosen'}</button>
          <p className="catatan-kecil">Mengirim merangkum semua entri dan menggantikan logbook yang sebelumnya diunggah.</p>
        </section>
      </div>

      <BlokDokumen data={data} jenis="logbook" muat={muat} petunjuk="Metode 2 · Unggah logbook sesuai format perusahaan tempat Anda magang (PDF). Mengunggah menggantikan entri yang sudah dikirim." />
    </>
  );
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
            ? <button type="button" className="btn keras kecil" onClick={() => unduhBerkas('/mahasiswa/dokumen-magang/laporan_akhir/template', 'Template_Laporan_Akhir.docx').catch((e) => setGalat(e.message))}>Unduh Template Laporan Akhir</button>
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
      <div className="dua-kolom" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
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
                  <td>{d.berkas ? <TautanBerkas className="btn garis kecil" path={`/mahasiswa/dokumen-magang/${d.jenis}/berkas`}>{d.jenis === 'laporan_akhir' && d.status === 'disetujui' ? 'Unduh' : 'Lihat'}</TautanBerkas> : d.ringkasan ? 'Ringkasan tertulis' : '–'}</td>
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

  const isi = !data ? <p className="kosong">Memuat…</p> : !data.ada_magang ? (
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
