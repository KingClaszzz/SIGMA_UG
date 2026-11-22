// PERAN: MAHASISWA (FR-02, FR-05, FR-10; UI-06, UI-07). Antrean validasi dan penerbitan surat milik Admin Prodi
// (FR-03, FR-04) dibangun di src/admin/; admin mengubah pengajuan.status dan mengisi pengajuan.surat.
import TautanBerkas from '../components/Berkas.jsx';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { api, useApi } from '../api';
import Badge from '../components/Badge.jsx';
import Berhasil from '../components/Berhasil.jsx';
import Steps from '../components/Steps.jsx';
import Tabs from '../components/Tabs.jsx';
import Timeline from '../components/Timeline.jsx';
import Upload from '../components/Upload.jsx';
import { durasi, rentang, sisaHari, tanggalAngka, tanggalPanjang } from '../format';
import './mahasiswa.css';

// Empat langkah seperti desain. Persetujuan admin langsung menerbitkan surat, jadi langkah 2, 3, dan 4 selesai bersamaan.
const LANGKAH = [
  { judul: 'Pengajuan dikirim', kunci: 'diajukan' },
  { judul: 'Divalidasi Admin Prodi', kunci: 'disetujui' },
  { judul: 'Ditandatangani Admin Prodi', kunci: 'disetujui' },
  { judul: 'Surat rekomendasi (PDF) terbit', kunci: 'diterbitkan' },
];
const SUDAH = { draft: 0, diajukan: 1, disetujui: 3, diterbitkan: 4, ditolak: 1 };
const tanggalStatus = (p, status) => p.riwayat.find((r) => r.status === status)?.pada;

function StatusPengajuan({ p, tombol = false }) {
  return (
    <section className="kartu">
      <div className="kartu-kepala">
        <h2>Status Pengajuan</h2>
        <Badge nilai={p?.status ?? 'draft'} label={p ? undefined : 'Belum diajukan'} />
      </div>
      <Timeline langkah={LANGKAH} sudah={SUDAH[p?.status ?? 'draft']} riwayat={p?.riwayat} ditolak={p?.status === 'ditolak'} alasan={p?.alasan_penolakan} />
      {tombol && (p?.surat
        ? <TautanBerkas className="btn isi" style={{ marginTop: 16, width: '100%' }} path={`/mahasiswa/rekomendasi/${p.id}/surat`}>Unduh Surat Rekomendasi (PDF)</TautanBerkas>
        : <button className="btn isi" style={{ marginTop: 16, width: '100%' }} disabled>{!p || p.status === 'draft' ? 'Belum ada pengajuan' : p.status === 'ditolak' ? 'Pengajuan ditolak' : 'Menunggu validasi'}</button>)}
    </section>
  );
}

// Pil periode hanya tampil di halaman pengajuan; di riwayat dan detail cuma menambah gangguan.
function Kepala({ judul, sub, denganPeriode = false }) {
  const { periode } = useOutletContext();
  const j = periode?.jadwal?.find((x) => x.jenis === 'pengajuan');
  return (
    <>
      <header className="halaman-kepala masuk">
        <div>
          <h1 className="judul">{judul}</h1>
          <p className="sub">{sub}</p>
        </div>
        {denganPeriode && (
          <div className={`pil-periode${j?.status === 'dibuka' ? '' : ' tutup'}`}>
            <strong>Periode Pengajuan</strong>
            {!j ? 'Belum diumumkan' : j.status === 'dibuka' ? `${rentang(j.buka, j.tutup)} · ${sisaHari(j.tutup)} hari lagi` : j.status === 'akan_dibuka' ? `Dibuka ${tanggalPanjang(j.buka)}` : 'Periode pengajuan sudah ditutup'}
          </div>
        )}
      </header>
      <Tabs items={[['/surat-rekomendasi', 'Ajukan Baru', true], ['/surat-rekomendasi/riwayat', 'Riwayat Pengajuan']]} />
    </>
  );
}

const formAwal = { nama_perusahaan: '', kepada: '', alamat_perusahaan: '', id_kategori: '', tgl_mulai: '', tgl_selesai: '' };

export function AjukanRekomendasi() {
  const { me, periode } = useOutletContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: daftar } = useApi('/mahasiswa/rekomendasi');
  const { data: kelayakan } = useApi('/mahasiswa/kelayakan');
  const [tahap, setTahap] = useState(0);
  const [draft, setDraft] = useState(null);
  const [form, setForm] = useState(formAwal);
  const [galat, setGalat] = useState(null);
  const [sibuk, setSibuk] = useState(false);
  const [berhasil, setBerhasil] = useState(false);
  const bukaPengajuan = periode?.jadwal?.find((x) => x.jenis === 'pengajuan')?.status === 'dibuka';

  // Melanjutkan draft dari riwayat (?draft=id).
  useEffect(() => {
    const id = params.get('draft');
    if (!id) return;
    api(`/mahasiswa/rekomendasi/${id}`).then((p) => {
      if (p.status !== 'draft') return;
      setDraft(p);
      setForm({ nama_perusahaan: p.nama_perusahaan, kepada: p.kepada, alamat_perusahaan: p.alamat_perusahaan, id_kategori: p.id_kategori, tgl_mulai: p.tgl_mulai, tgl_selesai: p.tgl_selesai });
    }, (e) => setGalat(e.message));
  }, [params]);

  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function simpan() {
    const p = await api(draft ? `/mahasiswa/rekomendasi/${draft.id}` : '/mahasiswa/rekomendasi', { method: draft ? 'PUT' : 'POST', body: form });
    setDraft(p);
    return p;
  }

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

  const syarat = draft?.dokumen_syarat ?? [];
  const lengkap = syarat.filter((x) => x.wajib).every((x) => x.berkas);
  const unggah = (jenis) => async (file) => setDraft(await api(`/mahasiswa/rekomendasi/${draft.id}/dokumen/${jenis}`, { method: 'POST', berkas: file }));
  const hapus = (jenis) => async () => setDraft(await api(`/mahasiswa/rekomendasi/${draft.id}/dokumen/${jenis}`, { method: 'DELETE' }));

  return (
    <div className="halaman">
      <Kepala denganPeriode judul="Ajukan Surat Rekomendasi Magang" sub={tahap === 0 ? 'Data akademik terisi otomatis dari data diri Anda. Lengkapi data perusahaan tujuan.' : 'Unggah dokumen untuk mendapatkan surat rekomendasi dari Program Studi.'} />
      {!bukaPengajuan && <p className="banner-peringatan" role="status"><strong>Pengajuan sedang tidak dibuka</strong>Anda dapat mengajukan lagi saat periode pengajuan dibuka.</p>}
      <Steps langkah={['Formulir Pengajuan', 'Unggah Dokumen']} aktif={tahap} />

      <div className="dua-kolom">
        {tahap === 0 ? (
          <form className="kartu" onSubmit={(e) => { e.preventDefault(); aksi(async () => { await simpan(); setTahap(1); }); }}>
            <h3 className="seksi">A. Data Mahasiswa</h3>
            <div className="grid-form">
              <label>NPM<input readOnly value={me.npm} /></label>
              <label>Nama<input readOnly value={me.nama} /></label>
              <label>Fakultas<input readOnly value="Ilmu Komputer dan Teknologi Informasi" /></label>
              <label>Jurusan/Program<input readOnly value="Sistem Informasi" /></label>
              <label>Tahun Akademik<input readOnly value={periode?.tahun_akademik ?? ''} /></label>
              <label>Semester<input readOnly value={me.semester} /></label>
              <label>No. Telepon/WA<input readOnly value={me.no_telepon} /></label>
              <label>IPK Terakhir<input readOnly value={Number(me.ipk).toFixed(2)} /></label>
              <label className="penuh">Alamat<input readOnly value={me.alamat ?? ''} /></label>
            </div>
            <p className="catatan-kecil">Data ini diambil dari <Link to="/profil">Profil</Link>. Ubah di sana bila ada yang keliru.</p>

            <h3 className="seksi">B. Perusahaan Tujuan</h3>
            <div className="grid-form">
              <label>Nama perusahaan *<input required maxLength={150} value={form.nama_perusahaan} onChange={ubah('nama_perusahaan')} /></label>
              <label>Kepada / Jabatan *<input required maxLength={100} value={form.kepada} onChange={ubah('kepada')} /></label>
              <label>Kategori perusahaan *
                <select required value={form.id_kategori} onChange={ubah('id_kategori')}>
                  <option value="">Pilih kategori</option>
                  {daftar?.kategori.map((k) => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
                </select>
              </label>
              <label>Alamat perusahaan *<input required maxLength={500} value={form.alamat_perusahaan} onChange={ubah('alamat_perusahaan')} /></label>
            </div>

            <h3 className="seksi">C. Rencana Magang</h3>
            <div className="grid-form tiga">
              <label>Tanggal Mulai *<input type="date" required value={form.tgl_mulai} onChange={ubah('tgl_mulai')} /></label>
              <label>Tanggal Selesai *<input type="date" required min={form.tgl_mulai} value={form.tgl_selesai} onChange={ubah('tgl_selesai')} /></label>
              <label>Estimasi Durasi<input readOnly value={durasi(form.tgl_mulai, form.tgl_selesai)} /></label>
            </div>

            {galat && <p className="pesan galat" role="alert" style={{ marginTop: 16 }}>{galat}</p>}
            <div className="baris-aksi">
              <button type="button" className="btn garis" disabled={sibuk || !bukaPengajuan} onClick={(e) => { const f = e.target.form; if (f.reportValidity()) aksi(async () => { await simpan(); navigate('/surat-rekomendasi/riwayat'); }); }}>Simpan Draft</button>
              <button type="submit" className="btn isi" disabled={sibuk || !bukaPengajuan}>Lanjut ke Tahap 2</button>
            </div>
          </form>
        ) : (
          <section className="kartu">
            <h3 className="seksi">Unggah Dokumen Persyaratan</h3>
            <div className="syarat-dok">
              {syarat.map((x) => (
                <div key={x.jenis}>
                  <div className="judul-dok">{x.label}<span className={`pil${x.wajib ? ' wajib' : ''}`}>{x.wajib ? 'Wajib' : 'Opsional'}</span></div>
                  <Upload berkas={x.berkas} tautan={`/mahasiswa/rekomendasi/${draft.id}/dokumen/${x.jenis}`} onPilih={unggah(x.jenis)} onHapus={hapus(x.jenis)} />
                </div>
              ))}
            </div>
            <p className="banner-info" style={{ marginTop: 16 }}>Catatan: IPK dan nilai akademik yang diinput akan diperiksa secara manual oleh Admin Prodi berdasarkan dokumen dan data akademik resmi. Pastikan seluruh dokumen wajib sudah diunggah sebelum mengajukan.</p>
            {galat && <p className="pesan galat" role="alert" style={{ marginTop: 16 }}>{galat}</p>}
            <div className="baris-aksi">
              <button type="button" className="btn garis" onClick={() => setTahap(0)}>Kembali</button>
              <button type="button" className="btn kuning" disabled={!lengkap || sibuk} onClick={() => aksi(async () => { setDraft(await api(`/mahasiswa/rekomendasi/${draft.id}/kirim`, { method: 'POST' })); setBerhasil(true); })}>Ajukan Pengajuan</button>
            </div>
          </section>
        )}

        <div className="kolom-samping">
          <section className="kartu">
            <h2>Cek Kelayakan</h2>
            <ul className="cek">
              {kelayakan?.map((k) => <li key={k.label} className={k.ok ? 'ok' : 'tidak'}><span aria-hidden="true">{k.ok ? '✓' : '!'}</span>{k.label}</li>)}
            </ul>
            <p className="catatan-kecil">Hanya petunjuk. Keputusan akhir ada pada Admin Prodi.</p>
          </section>
          <StatusPengajuan p={draft} tombol />
        </div>
      </div>

      {berhasil && (
        <Berhasil judul="Pengajuan Berhasil Dikirim" aksi={[{ to: '/dashboard', label: 'Ke Dashboard' }, { to: `/surat-rekomendasi/riwayat/${draft.id}`, label: 'Lihat Status', utama: true }]} />
      )}
    </div>
  );
}

export function RiwayatRekomendasi() {
  const { data, error } = useApi('/mahasiswa/rekomendasi');
  return (
    <div className="halaman">
      <Kepala judul="Status Pengajuan Surat Rekomendasi" sub="Pantau proses pengajuan kamu secara langsung." />
      <section className="kartu masuk">
        <h2>Pengajuan Surat Rekomendasi</h2>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <p className="kosong">Memuat…</p> : data.pengajuan.length === 0 ? (
          <p className="kosong">Belum ada pengajuan. <Link to="/surat-rekomendasi">Ajukan surat rekomendasi</Link></p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>No</th><th>Perusahaan</th><th>Tanggal</th><th>Status</th><th>Terbit</th><th>Aksi</th></tr></thead>
              <tbody>
                {data.pengajuan.map((p) => {
                  const terbit = tanggalStatus(p, 'diterbitkan');
                  return (
                    <tr key={p.id}>
                      <td>{p.nomor}</td>
                      <td>{p.nama_perusahaan}</td>
                      <td>{tanggalAngka(tanggalStatus(p, 'diajukan') ?? p.dibuat_pada)}</td>
                      <td><Badge nilai={p.status} label={p.status === 'draft' && p.alasan_penolakan ? 'Perlu Perbaikan' : undefined} /></td>
                      <td>{terbit ? tanggalAngka(terbit) : '–'}</td>
                      <td className="td-aksi">
                        {p.status === 'draft'
                          ? <Link className="btn kuning kecil" to={`/surat-rekomendasi?draft=${p.id}`}>{p.alasan_penolakan ? 'Perbaiki' : 'Lanjutkan'}</Link>
                          : <Link className="btn garis kecil" to={`/surat-rekomendasi/riwayat/${p.id}`}>Lihat Detail</Link>}
                        {p.surat && <TautanBerkas className="btn isi kecil" path={`/mahasiswa/rekomendasi/${p.id}/surat`}>Unduh Surat</TautanBerkas>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function DetailRekomendasi() {
  const { id } = useParams();
  const { data: p, error } = useApi(`/mahasiswa/rekomendasi/${id}`);
  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!p) return <p className="sub">Memuat…</p>;
  const terkirim = p.dokumen_syarat.filter((x) => x.berkas);

  return (
    <div className="halaman">
      <Kepala judul="Status Pengajuan Surat Rekomendasi" sub="Pantau proses pengajuan kamu secara langsung." />
      <Link to="/surat-rekomendasi/riwayat" className="kembali">← Kembali</Link>

      {p.status === 'ditolak' && <p className="banner-galat" role="status"><strong>Pengajuan ditolak</strong>{p.alasan_penolakan ?? 'Hubungi Admin Prodi untuk keterangan lebih lanjut.'}</p>}
      {p.status === 'draft' && (p.alasan_penolakan
        ? <p className="banner-peringatan" role="status"><strong>Admin Prodi meminta perbaikan</strong>{p.alasan_penolakan}<br /><Link to={`/surat-rekomendasi?draft=${p.id}`} style={{ fontWeight: 600, textDecoration: 'underline' }}>Perbaiki dan kirim ulang</Link></p>
        : <p className="banner-peringatan" role="status"><strong>Pengajuan belum dikirim</strong><Link to={`/surat-rekomendasi?draft=${p.id}`}>Lanjutkan pengajuan</Link></p>)}

      <section className="kartu masuk">
        <div className="kartu-kepala"><h2>Pengajuan Surat Rekomendasi</h2><Badge nilai={p.status} /></div>
        <dl className="kv-grid">
          <div className="kv"><dt>Perusahaan tujuan</dt><dd>{p.nama_perusahaan}</dd></div>
          <div className="kv"><dt>Kepada</dt><dd>{p.kepada}</dd></div>
          <div className="kv"><dt>Tanggal pengajuan</dt><dd>{tanggalAngka(tanggalStatus(p, 'diajukan') ?? p.dibuat_pada)}</dd></div>
          <div className="kv"><dt>Nomor pengajuan</dt><dd>{p.nomor}</dd></div>
        </dl>
      </section>

      <div className="dua-kolom">
        <StatusPengajuan p={p} />
        <div className="kolom-samping">
          <section className="kartu">
            <h2>{p.surat ? 'Surat Rekomendasi Terbit' : 'Surat Rekomendasi'}</h2>
            {p.surat ? (
              <>
                <p className="isi">Nomor surat {p.surat.nomor_surat} · terbit {tanggalAngka(p.surat.diterbitkan_pada)}. Surat dapat diunduh kapan saja.</p>
                <TautanBerkas className="btn isi" style={{ marginTop: 14 }} path={`/mahasiswa/rekomendasi/${p.id}/surat`}>Unduh Surat Rekomendasi (PDF)</TautanBerkas>
              </>
            ) : (
              <>
                <p className="isi">Tombol unduh aktif setelah surat terbit.</p>
                <button className="btn isi" style={{ marginTop: 14 }} disabled>Surat belum tersedia</button>
              </>
            )}
          </section>
          <section className="kartu">
            <h2>Dokumen terkirim</h2>
            {terkirim.length === 0 ? <p className="kosong">Belum ada dokumen.</p> : (
              <ul className="daftar-dok">
                {terkirim.map((x) => <li key={x.jenis}><span>{x.label}</span><TautanBerkas className="aksi-kecil" path={`/mahasiswa/rekomendasi/${p.id}/dokumen/${x.jenis}`}>Lihat</TautanBerkas></li>)}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
