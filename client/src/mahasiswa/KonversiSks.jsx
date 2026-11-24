import Muat from '../components/Muat.jsx';
// PERAN: MAHASISWA (FR-06, FR-07, FR-08). Pemeriksaan, pemetaan SKS, dan penerbitan surat konversi dikerjakan Admin Prodi (src/admin/).
import TautanBerkas from '../components/Berkas.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { api, unduhBerkas, useApi } from '../api';
import Badge from '../components/Badge.jsx';
import Berhasil from '../components/Berhasil.jsx';
import Steps from '../components/Steps.jsx';
import Tabs from '../components/Tabs.jsx';
import Timeline from '../components/Timeline.jsx';
import Upload from '../components/Upload.jsx';
import { rentang, sisaHari, tanggalAngka, tanggalPanjang } from '../format';
import './mahasiswa.css';

// Tiga langkah seperti desain. Persetujuan admin langsung menerbitkan surat konversi, jadi tidak ada langkah terpisah untuk surat.
const langkahKonversi = (ditolak) => [
  { judul: 'Pengajuan dikirim', kunci: 'diajukan' },
  { judul: 'Divalidasi Admin Prodi', kunci: 'ditinjau' },
  { judul: ditolak ? 'Tidak Disetujui' : 'Disetujui', kunci: ditolak ? 'ditolak' : 'diterbitkan' },
];
const SUDAH = { draft: 0, diajukan: 1, ditinjau: 1, diproses: 2, diterbitkan: 3, selesai: 3, ditolak: 2 };
const tanggalStatus = (k, status) => k.riwayat.find((r) => r.status === status)?.pada;

function Kepala({ judul, sub }) {
  return (
    <>
      <header className="masuk">
        <h1 className="judul">{judul}</h1>
        <p className="sub">{sub}</p>
      </header>
      <Tabs items={[['/konversi-sks', 'Ajukan Konversi', true], ['/konversi-sks/riwayat', 'Riwayat Pengajuan']]} />
    </>
  );
}

// ---------- Ajukan Konversi (ringkasan) ----------
export default function KonversiSks() {
  const { periode } = useOutletContext();
  const { data, error } = useApi('/mahasiswa/konversi');
  const j = periode?.jadwal?.find((x) => x.jenis === 'konversi');
  const dibuka = j?.status === 'dibuka';

  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!data) return <Muat />;
  const terakhir = data.konversi[0];
  const perluDilengkapi = data.konversi.filter((k) => ['draft', 'ditolak'].includes(k.status));

  return (
    <div className="halaman">
      <Kepala judul="Penerimaan dan Konversi SKS" sub="Ajukan konversi SKS dari kegiatan magang Anda dengan mengunggah surat penerimaan perusahaan dan silabus magang." />

      <section className="hitung-mundur masuk">
        <div>
          <small>Deadline Pengajuan Konversi SKS</small>
          <p className="angka">{!j ? 'Belum diumumkan' : dibuka ? `${sisaHari(j.tutup)} hari lagi` : j.status === 'akan_dibuka' ? `Dibuka ${tanggalPanjang(j.buka)}` : 'Periode ditutup'}</p>
          {j && <small>Batas akhir: <strong>{tanggalPanjang(j.tutup)}</strong>. Unggah surat penerimaan perusahaan dan silabus sebelum deadline.</small>}
        </div>
        {j && <div className="gelombang"><strong>Gelombang {periode.gelombang}</strong>{rentang(j.buka, j.tutup)}</div>}
      </section>

      {data.siap_diajukan.length === 0 && perluDilengkapi.length === 0 && (
        <p className="banner-info" role="status">
          <strong>{data.konversi.length ? 'Tidak ada pengajuan baru' : 'Belum ada pengajuan'}</strong>
          Konversi SKS diajukan dari surat rekomendasi yang sudah terbit. <Link to="/surat-rekomendasi">Ajukan surat rekomendasi</Link> bila belum punya.
        </p>
      )}

      <div className="dua-kolom">
        <section className="kartu masuk">
          <h2>Kelengkapan Dokumen</h2>
          {perluDilengkapi.map((k) => (
            <div key={k.id} className="kartu-pilih">
              <Link to={`/konversi-sks/ajukan/${k.id}`}>
                <span><strong>{k.nama_perusahaan}</strong><small>{k.status === 'ditolak' ? 'Ditolak, perbaiki lalu ajukan ulang' : 'Draft belum dikirim'} · Surat penerimaan {k.surat_penerimaan ? '✓' : '–'} · Silabus {k.silabus ? '✓' : '–'}</small></span>
                <span className="btn kuning kecil">{k.status === 'ditolak' ? 'Perbaiki' : 'Lanjutkan'}</span>
              </Link>
            </div>
          ))}
          {data.siap_diajukan.length > 0 && (
            <>
              <p className="isi" style={{ marginTop: perluDilengkapi.length ? 18 : 0 }}>Surat rekomendasi yang sudah terbit. Pilih salah satu untuk memulai pengajuan:</p>
              <div className="kartu-pilih">
                {data.siap_diajukan.map((p) => (
                  <Link key={p.id} to={`/konversi-sks/ajukan?pengajuan=${p.id}`} aria-disabled={!dibuka} onClick={(e) => !dibuka && e.preventDefault()} style={dibuka ? undefined : { opacity: 0.55, cursor: 'not-allowed' }}>
                    <span><strong>{p.nama_perusahaan}</strong><small>{p.nomor}</small></span>
                    <span className="btn kuning kecil">Mulai Pengajuan</span>
                  </Link>
                ))}
              </div>
              {!dibuka && <p className="catatan-kecil">Pengajuan konversi hanya bisa dimulai saat periode konversi dibuka.</p>}
            </>
          )}
          {data.siap_diajukan.length === 0 && perluDilengkapi.length === 0 && <p className="kosong">Tidak ada dokumen yang perlu dilengkapi.</p>}
        </section>

        <section className="kartu masuk">
          <h2>Status Pengajuan Saat Ini</h2>
          {terakhir ? (
            <>
              <Badge nilai={terakhir.status} />
              <p className="isi" style={{ marginTop: 10 }}>{terakhir.nama_perusahaan} · {terakhir.nomor}</p>
              <Link className="btn garis kecil" style={{ marginTop: 12 }} to={`/konversi-sks/riwayat/${terakhir.id}`}>Lihat Detail</Link>
            </>
          ) : (
            <>
              <Badge nilai="belum" label="Belum Mengajukan" />
              <p className="isi" style={{ marginTop: 10 }}>Anda belum mengajukan konversi SKS.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------- Wizard pengajuan (3 langkah) ----------
export function AjukanKonversi() {
  const { me } = useOutletContext();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: daftar } = useApi('/mahasiswa/konversi');
  const formRef = useRef(null);
  const [tahap, setTahap] = useState(0);
  const [k, setK] = useState(null);
  const [form, setForm] = useState({ posisi: '', tgl_mulai: '', tgl_selesai: '' });
  const [yakin, setYakin] = useState(false);
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [berhasil, setBerhasil] = useState(false);

  useEffect(() => {
    if (!id) return;
    api(`/mahasiswa/konversi/${id}`).then((x) => {
      setK(x);
      setForm({ posisi: x.posisi, tgl_mulai: x.tgl_mulai, tgl_selesai: x.tgl_selesai });
    }, (e) => setGalat(e.message));
  }, [id]);

  const idPengajuan = k?.id_pengajuan ?? Number(params.get('pengajuan'));
  const perusahaan = k?.nama_perusahaan ?? daftar?.siap_diajukan.find((p) => p.id === idPengajuan)?.nama_perusahaan ?? '';
  const ubah = (nama) => (e) => setForm({ ...form, [nama]: e.target.value });

  // Mengunggah sebelum informasi disimpan dianggap menyimpan informasi lebih dulu.
  async function simpan() {
    if (!formRef.current.reportValidity()) throw new Error('Lengkapi informasi magang terlebih dahulu.');
    const x = await api(k ? `/mahasiswa/konversi/${k.id}` : '/mahasiswa/konversi', { method: k ? 'PUT' : 'POST', body: { ...form, id_pengajuan: idPengajuan } });
    setK(x);
    return x;
  }
  const unggah = (rute, simpanDulu) => async (file) => {
    const x = simpanDulu ? await simpan() : k;
    setK(await api(`/mahasiswa/konversi/${x.id}/${rute}`, { method: 'POST', berkas: file }));
  };
  async function aksi(fn) {
    setGalat(null);
    setSibuk(true);
    try {
      await fn();
    } catch (e) {
      setGalat(e.message);
    } finally {
      setSibuk(false);
    }
  }

  const judulTahap = ['Surat Penerimaan Perusahaan', 'Upload Silabus Magang', 'Konfirmasi Pengajuan'][tahap];
  const subTahap = [
    'Surat ini menjadi bukti bahwa Anda sudah diterima magang di perusahaan. Admin Prodi akan memeriksanya.',
    'Unduh template dari kampus, lengkapi, lalu unggah kembali.',
    'Periksa kembali data dan dokumen sebelum dikirim ke Admin Prodi.',
  ][tahap];

  if (!id && !idPengajuan) return <p className="sub">Pilih surat rekomendasi dari <Link to="/konversi-sks">halaman konversi</Link>.</p>;

  return (
    <div className="halaman" style={{ maxWidth: 980 }}>
      <Steps langkah={['Surat Penerimaan', 'Silabus', 'Konfirmasi']} aktif={tahap} />
      <header className="masuk">
        <h1 className="judul">{judulTahap}</h1>
        <p className="sub">{subTahap}</p>
      </header>

      <div className="dua-kolom">
        <div className="kolom-samping">
          {tahap === 0 && (
            <form ref={formRef} className="kartu" onSubmit={(e) => { e.preventDefault(); aksi(async () => { const x = await simpan(); if (!x.surat_penerimaan) throw new Error('Unggah surat penerimaan terlebih dahulu.'); setTahap(1); }); }}>
              <h2>Informasi Magang</h2>
              <div className="grid-form">
                <label>Nama Perusahaan<input readOnly value={perusahaan} /></label>
                <label>Posisi / Divisi Magang *<input required maxLength={100} value={form.posisi} onChange={ubah('posisi')} /></label>
                <label>Tanggal Mulai Magang *<input type="date" required value={form.tgl_mulai} onChange={ubah('tgl_mulai')} /></label>
                <label>Tanggal Selesai Magang *<input type="date" required min={form.tgl_mulai} value={form.tgl_selesai} onChange={ubah('tgl_selesai')} /></label>
              </div>
              <div className="syarat-dok">
                <div>
                  <div className="judul-dok">Unggah Surat Penerimaan (PDF)<span className="pil wajib">Wajib</span></div>
                  <Upload berkas={k?.surat_penerimaan} tautan={k && `/mahasiswa/konversi/${k.id}/surat-penerimaan`} onPilih={unggah('surat-penerimaan', true)} />
                </div>
              </div>
              {galat && <p className="pesan galat" role="alert" style={{ marginTop: 16 }}>{galat}</p>}
              <div className="baris-aksi">
                <button type="button" className="btn garis" onClick={() => navigate('/konversi-sks')}>Kembali</button>
                <button type="submit" className="btn isi" disabled={sibuk}>Lanjut ke Tahap 2</button>
              </div>
            </form>
          )}

          {tahap === 1 && (
            <section className="kartu">
              <h2>A. Unduh Form Isian Magang</h2>
              <p className="isi">Unduh form kosong ini, isi sendiri, lalu unggah kembali sebagai silabus. Jangan mengubah struktur formnya.</p>
              <div className="baris-dok" style={{ marginTop: 12 }}>
                Form_Magang_Mitra_2026.docx
                {daftar?.template_tersedia
                  ? <button type="button" className="btn keras kecil" onClick={() => unduhBerkas('/mahasiswa/konversi/template-silabus', 'Form_Magang_Mitra_2026.docx').catch((e) => setGalat(e.message))}>Unduh Form Isian Magang</button>
                  : <span className="badge kuning">Belum disediakan prodi</span>}
              </div>
              <h2 style={{ marginTop: 24 }}>B. Upload Silabus <span className="pil wajib">Wajib</span></h2>
              <Upload berkas={k.silabus} tautan={`/mahasiswa/konversi/${k.id}/silabus`} onPilih={unggah('silabus')} />
              {galat && <p className="pesan galat" role="alert" style={{ marginTop: 16 }}>{galat}</p>}
              <div className="baris-aksi">
                <button type="button" className="btn garis" onClick={() => setTahap(0)}>Kembali</button>
                <button type="button" className="btn isi" disabled={!k.silabus} onClick={() => setTahap(2)}>Lanjut ke Tahap 3</button>
              </div>
            </section>
          )}

          {tahap === 2 && (
            <>
              <section className="kartu">
                <h2>A. Informasi Mahasiswa</h2>
                <dl className="kv-grid">
                  <div className="kv"><dt>Nama lengkap</dt><dd>{me.nama}</dd></div>
                  <div className="kv"><dt>NPM</dt><dd>{me.npm}</dd></div>
                  <div className="kv"><dt>Semester</dt><dd>{me.semester}</dd></div>
                </dl>
              </section>
              <section className="kartu">
                <h2>B. Informasi Perusahaan</h2>
                <dl className="kv-grid">
                  <div className="kv"><dt>Nama perusahaan</dt><dd>{k.nama_perusahaan}</dd></div>
                  <div className="kv"><dt>Posisi / divisi</dt><dd>{k.posisi}</dd></div>
                  <div className="kv"><dt>Periode magang</dt><dd>{rentang(k.tgl_mulai, k.tgl_selesai)}</dd></div>
                </dl>
              </section>
              <section className="kartu">
                <h2>C. Dokumen yang Diunggah</h2>
                {[['Surat Penerimaan Perusahaan', k.surat_penerimaan, 'surat-penerimaan'], ['Silabus Magang', k.silabus, 'silabus']].map(([label, b, rute]) => (
                  <div key={rute} className="baris-dok">
                    <span>{label}<br /><small style={{ fontWeight: 400 }}>{b?.nama}</small></span>
                    <TautanBerkas className="btn garis kecil" path={`/mahasiswa/konversi/${k.id}/${rute}`}>Lihat File</TautanBerkas>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>

        <div className="kolom-samping">
          {tahap === 2 ? (
            <section className="kartu">
              <h2>Pernyataan</h2>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontWeight: 400, color: 'var(--blue-17)' }}>
                <input type="checkbox" checked={yakin} onChange={(e) => setYakin(e.target.checked)} style={{ marginTop: 3 }} />
                Saya telah memastikan bahwa data dan dokumen yang dikirim sudah benar.
              </label>
              {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
              <div className="baris-aksi">
                <button type="button" className="btn garis" onClick={() => setTahap(1)}>Kembali</button>
                <button type="button" className="btn kuning" disabled={!yakin || sibuk} onClick={() => aksi(async () => { setK(await api(`/mahasiswa/konversi/${k.id}/kirim`, { method: 'POST' })); setBerhasil(true); })}>Kirim Pengajuan</button>
              </div>
            </section>
          ) : (
            <section className="kartu">
              <h2>Fungsi Dokumen</h2>
              <p className="isi">{tahap === 0 ? 'Menunjukkan bahwa perusahaan menerima Anda untuk magang, termasuk posisi dan periode pelaksanaan.' : 'Silabus harus menggambarkan pekerjaan, tanggung jawab, dan kegiatan Anda selama magang.'}</p>
            </section>
          )}
        </div>
      </div>

      {berhasil && <Berhasil judul="Pengajuan Berhasil Dikirim" aksi={[{ to: '/dashboard', label: 'Ke Dashboard' }, { to: `/konversi-sks/riwayat/${k.id}`, label: 'Lihat Status', utama: true }]} />}
    </div>
  );
}

// ---------- Riwayat ----------
export function RiwayatKonversi() {
  const { data, error } = useApi('/mahasiswa/konversi');
  return (
    <div className="halaman">
      <Kepala judul="Riwayat Pengajuan Konversi SKS" sub="Seluruh pengajuan konversi SKS Anda." />
      <section className="kartu masuk">
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.konversi.length === 0 ? (
          <p className="kosong">Belum ada pengajuan konversi.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Nomor Pengajuan</th><th>Tanggal</th><th>Perusahaan</th><th>Status</th><th>Tgl Persetujuan</th><th>Aksi</th></tr></thead>
              <tbody>
                {data.konversi.map((k) => (
                  <tr key={k.id}>
                    <td>{k.nomor}</td>
                    <td>{tanggalAngka(tanggalStatus(k, 'diajukan') ?? k.dibuat_pada)}</td>
                    <td>{k.nama_perusahaan}</td>
                    <td><Badge nilai={k.status} /></td>
                    <td>{tanggalStatus(k, 'diterbitkan') ? tanggalAngka(tanggalStatus(k, 'diterbitkan')) : '–'}</td>
                    <td className="td-aksi">
                      {['draft', 'ditolak'].includes(k.status)
                        ? <Link className="btn kuning kecil" to={`/konversi-sks/ajukan/${k.id}`}>{k.status === 'draft' ? 'Lanjutkan' : 'Perbaiki'}</Link>
                        : <Link className="btn garis kecil" to={`/konversi-sks/riwayat/${k.id}`}>Lihat Detail</Link>}
                      {k.surat_tersedia && <TautanBerkas className="btn isi kecil" path={`/mahasiswa/konversi/${k.id}/surat`}>Unduh Surat</TautanBerkas>}
                    </td>
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

export function DetailKonversi() {
  const { id } = useParams();
  const { me } = useOutletContext();
  const { data: k, error } = useApi(`/mahasiswa/konversi/${id}`);
  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!k) return <Muat />;
  const total = k.hasil?.matkul.reduce((t, m) => t + m.sks_diakui, 0);

  return (
    <div className="halaman">
      <Kepala judul="Riwayat Pengajuan Konversi SKS" sub="Seluruh pengajuan konversi SKS Anda." />
      <Link to="/konversi-sks/riwayat" className="kembali">← Kembali</Link>

      {k.status === 'ditolak' && (
        <p className="banner-galat" role="status">
          <strong>Pengajuan konversi SKS ditolak</strong>{k.alasan_penolakan ?? 'Hubungi Admin Prodi untuk keterangan lebih lanjut.'}
          <br /><Link to={`/konversi-sks/ajukan/${k.id}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>Perbaiki dan ajukan ulang</Link>
        </p>
      )}
      {k.hasil && (
        <p className="banner-ok" role="status"><strong>Pengajuan Konversi SKS Disetujui</strong>Lihat hasil konversi di bawah{k.surat_tersedia ? ' dan unduh surat konversi.' : '.'}<br />
          <button type="button" className="btn kuning kecil" style={{ marginTop: 8 }} onClick={() => document.getElementById('hasil-konversi')?.scrollIntoView({ behavior: 'smooth' })}>Lihat Hasil Konversi</button>
        </p>
      )}

      <section className="kartu masuk">
        <div className="kartu-kepala"><h2>Pengajuan Konversi SKS</h2><Badge nilai={k.status} /></div>
        <dl className="kv-grid" style={{ marginTop: 12 }}>
          <div className="kv"><dt>Nomor pengajuan</dt><dd>{k.nomor}</dd></div>
          <div className="kv"><dt>Perusahaan</dt><dd>{k.nama_perusahaan}</dd></div>
          <div className="kv"><dt>Tanggal pengajuan</dt><dd>{tanggalPanjang(tanggalStatus(k, 'diajukan') ?? k.dibuat_pada)}</dd></div>
        </dl>
      </section>

      <div className="dua-kolom">
        <section className="kartu">
          <h2>Status Pengajuan</h2>
          <Timeline langkah={langkahKonversi(k.status === 'ditolak')} sudah={SUDAH[k.status]} riwayat={k.riwayat} ditolak={k.status === 'ditolak'} alasan={k.alasan_penolakan} />
        </section>
        <section className="kartu">
          <h2>Dokumen Terkirim</h2>
          <ul className="daftar-dok">
            {[['Surat Penerimaan Perusahaan', k.surat_penerimaan, 'surat-penerimaan'], ['Silabus Magang', k.silabus, 'silabus']].map(([label, b, rute]) => (
              <li key={rute}><span>{label}</span>{b ? <TautanBerkas className="aksi-kecil" path={`/mahasiswa/konversi/${k.id}/${rute}`}>Lihat</TautanBerkas> : <span className="badge abu">Belum</span>}</li>
            ))}
          </ul>
        </section>
      </div>

      {k.hasil && (
        <section className="kartu masuk" id="hasil-konversi">
          <h2>Hasil Konversi</h2>
          <dl className="kv-grid"><div className="kv"><dt>Dosen Pendamping</dt><dd>{k.hasil.dosen_pendamping ?? 'Belum ditetapkan'}</dd></div></dl>
          <div className="tabel-wrap tabel-hasil" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>No</th><th>Kode</th><th>Mata Kuliah</th><th>SKS</th><th>Semester</th></tr></thead>
              <tbody>
                {k.hasil.matkul.map((m, i) => <tr key={m.kode_mk}><td>{i + 1}</td><td>{m.kode_mk}</td><td>{m.nama_mk}</td><td>{m.sks_diakui}</td><td>{me.semester}</td></tr>)}
                <tr className="total"><td /><td>Total</td><td /><td>{total}</td><td /></tr>
              </tbody>
            </table>
          </div>
          <div className="baris-aksi">
            <Link className="btn garis" to="/konversi-sks/riwayat">Lihat Riwayat</Link>
            {k.surat_tersedia
              ? <TautanBerkas className="btn isi" path={`/mahasiswa/konversi/${k.id}/surat`}>Unduh Surat Konversi SKS (PDF)</TautanBerkas>
              : <button className="btn isi" disabled>Surat konversi belum diterbitkan</button>}
          </div>
        </section>
      )}
    </div>
  );
}
