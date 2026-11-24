import Muat from '../components/Muat.jsx';
// PERAN: ADMIN PRODI — informasi dan pengaturan periode magang (FR-09). Periode terbaru yang dipublikasikan menjadi periode berjalan
// di seluruh sistem (landing, dashboard mahasiswa, batas pengajuan surat, konversi, dan laporan). Draft belum terlihat mahasiswa.
// Status tampilan: Aktif (dipublikasikan), Draft, Selesai (semua tenggat sudah lewat).
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useAksi, useApi } from '../api';
import Dialog from '../components/Dialog.jsx';
import { tanggalAngka, tanggalPanjang } from '../format';

const KOSONG = {
  tahun_akademik: '', gelombang: '1', nama_periode: '', deskripsi: '', semester: '',
  tgl_buka: '', tgl_tutup: '', tgl_buka_konversi: '', batas_konversi: '', tgl_buka_dokumen: '', batas_laporan: '',
  min_semester: '5', min_ipk: '3.00', ketentuan: '',
};
const DARI = (p) => Object.fromEntries(Object.keys(KOSONG).map((k) => [k, p[k] == null ? '' : String(p[k])]));
const STATUS = { aktif: ['Aktif', 'hijau'], draft: ['Draft', 'abu'], selesai: ['Selesai', 'merah'] };
const tgl = (v) => (v ? tanggalPanjang(v) : '–');
const pendek = (v) => (v ? tanggalAngka(v) : '–');
const Status = ({ nilai }) => <span className={`badge ${STATUS[nilai][1]}`}>{STATUS[nilai][0]}</span>;

export function DaftarPeriode() {
  const [cari, setCari] = useState('');
  const [status, setStatus] = useState('semua');
  const { data, error, muat } = useApi(`/admin/periode?status=${status}&q=${encodeURIComponent(cari)}`);
  const [ubah, setUbah] = useState(null); // periode yang akan diaktifkan / dinonaktifkan
  const { sibuk, galat, jalan } = useAksi(muat);
  const aktif = ubah?.status_tampil === 'aktif';

  return (
    <div className="halaman admin-lebar">
      <header className="halaman-kepala masuk">
        <div>
          <h1 className="judul">Informasi Periode</h1>
          <p className="sub">Atur jadwal pengajuan surat, konversi SKS, dan pengumpulan dokumen. Periode terbaru yang dipublikasikan menjadi periode berjalan.</p>
        </div>
        <Link to="/admin/periode/baru" className="btn kuning">+ Tambah Periode</Link>
      </header>
      {galat && <p className="banner-galat" role="alert">{galat}</p>}

      <section className="kartu">
        <div className="alat-tabel">
          <input type="search" placeholder="Cari tahun akademik atau nama periode…" aria-label="Cari periode" value={cari} onChange={(e) => setCari(e.target.value)} />
          <select aria-label="Status periode" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="semua">Semua Status</option><option value="aktif">Aktif</option><option value="draft">Draft</option><option value="selesai">Selesai</option>
          </select>
        </div>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.length === 0 ? (
          <p className="kosong">Belum ada periode yang cocok. Mahasiswa belum bisa mengajukan surat sampai periode dipublikasikan.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Tahun Akademik</th><th>Semester</th><th>Gelombang</th><th>Batas Surat Rekomendasi</th><th>Batas Konversi</th><th>Batas Dokumen Akhir</th><th>Status</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id_periode}>
                    <td>{p.tahun_akademik}{p.nama_periode && <small className="kecil-abu">{p.nama_periode}</small>}</td>
                    <td>{p.semester ?? '–'}</td>
                    <td>{p.gelombang}</td>
                    <td>{pendek(p.tgl_tutup)}</td><td>{pendek(p.batas_konversi)}</td><td>{pendek(p.batas_laporan)}</td>
                    <td><Status nilai={p.status_tampil} /></td>
                    <td className="td-aksi">
                      <Link className="btn garis kecil" to={`/admin/periode/${p.id_periode}`}>Detail</Link>
                      <Link className="btn garis kecil" to={`/admin/periode/${p.id_periode}/ubah`}>Edit</Link>
                      {p.status_tampil !== 'selesai' && <button className={`btn garis kecil${p.status_tampil === 'aktif' ? ' bahaya' : ''}`} onClick={() => setUbah(p)}>{p.status_tampil === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ubah && (
        <Dialog judul={aktif ? 'Nonaktifkan Periode?' : 'Aktifkan Periode?'} onTutup={() => setUbah(null)}>
          <p className="isi">{aktif ? 'Periode kembali menjadi draft dan tidak lagi terlihat oleh mahasiswa.' : 'Periode ini menjadi periode berjalan dan terlihat oleh mahasiswa.'} <strong>{ubah.tahun_akademik}</strong></p>
          <div className="dialog-aksi">
            <button className="btn garis" onClick={() => setUbah(null)}>Batal</button>
            <button className={`btn ${aktif ? 'garis bahaya' : 'isi'}`} disabled={sibuk} onClick={async () => { await jalan(() => api(`/admin/periode/${ubah.id_periode}/status`, { method: 'POST', body: { status: aktif ? 'draft' : 'dipublikasikan' } }), { judul: aktif ? 'Periode dinonaktifkan' : 'Periode diaktifkan' }); setUbah(null); }}>{aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export function DetailPeriode() {
  const { id } = useParams();
  const { data: p, error } = useApi(`/admin/periode/${id}`);
  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!p) return <Muat />;
  const ket = [['Maksimal Konversi', `${2} kali`], ['Minimal Semester', p.min_semester], ['Minimal IPK', Number(p.min_ipk).toFixed(2)], ['Ketentuan Nilai', 'Tidak ada nilai E']];
  return (
    <div className="halaman admin-lebar">
      <Link to="/admin/periode" className="kembali">← Kembali ke Informasi Periode</Link>
      <header className="halaman-kepala masuk">
        <div>
          <h1 className="judul">Detail Periode {p.tahun_akademik}</h1>
          <p className="sub">{p.nama_periode} · Gelombang {p.gelombang}{p.semester ? ` · Semester ${p.semester}` : ''}</p>
        </div>
        <div className="aksi-keputusan" style={{ marginTop: 0 }}>
          <Status nilai={p.status_tampil} />
          <Link to={`/admin/periode/${p.id_periode}/ubah`} className="btn isi kecil">Edit Periode</Link>
        </div>
      </header>

      <div className="tiga-kartu">
        <section className="kartu"><h2>Jadwal Surat Rekomendasi</h2><dl className="kv-polos satu-kolom"><div><dt>Mulai</dt><dd>{tgl(p.tgl_buka)}</dd></div><div><dt>Berakhir</dt><dd>{tgl(p.tgl_tutup)}</dd></div></dl></section>
        <section className="kartu"><h2>Jadwal Konversi SKS</h2><dl className="kv-polos satu-kolom"><div><dt>Mulai</dt><dd>{p.jadwal.find((j) => j.jenis === 'konversi') ? tgl(p.jadwal.find((j) => j.jenis === 'konversi').buka) : '–'}</dd></div><div><dt>Berakhir</dt><dd>{tgl(p.batas_konversi)}</dd></div></dl></section>
        <section className="kartu"><h2>Jadwal Dokumen Magang</h2><dl className="kv-polos satu-kolom"><div><dt>Mulai</dt><dd>{tgl(p.tgl_buka_dokumen)}</dd></div><div><dt>Deadline</dt><dd>{tgl(p.batas_laporan)}</dd></div></dl></section>
      </div>

      <div className="dua-kolom-admin rata">
        <section className="kartu">
          <h2>Ketentuan Magang</h2>
          <dl className="kv-polos">{ket.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {p.ketentuan && <p className="isi" style={{ marginTop: 12 }}>{p.ketentuan}</p>}
        </section>
        <section className="kartu">
          <h2>Ringkasan Periode</h2>
          <dl className="kv-polos">
            <div><dt>Mahasiswa mengajukan</dt><dd>{p.mengajukan}</dd></div>
            <div><dt>Pengajuan diproses</dt><dd>{p.diproses}</dd></div>
          </dl>
          {p.deskripsi && <p className="isi" style={{ marginTop: 12 }}>{p.deskripsi}</p>}
        </section>
      </div>
    </div>
  );
}

// Formulir "Tambah Periode" / ubah periode. Maks. konversi (2 kali) dan syarat nilai E ditetapkan SRS (BR-02, BR-03), jadi hanya tampil.
export function FormPeriode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ada, error } = useApi(id ? `/admin/periode/${id}` : null);
  const [form, setForm] = useState(KOSONG);
  const [konfirmasi, setKonfirmasi] = useState(null); // 'publikasi' | 'simpan'
  const formRef = useRef(null);
  const { sibuk, galat, jalan } = useAksi();
  useEffect(() => { if (id && ada) setForm(DARI(ada)); }, [id, ada]);
  const ubah = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const simpan = (status) => jalan(async () => {
    await api(id ? `/admin/periode/${id}` : '/admin/periode', { method: id ? 'PUT' : 'POST', body: { ...form, status } });
    navigate('/admin/periode');
  }, { judul: status === 'draft' ? 'Draft periode tersimpan' : id ? 'Perubahan periode tersimpan' : 'Periode dipublikasikan', teks: status === 'draft' ? null : 'Jadwal dan ketentuan langsung berlaku.' });

  if (id && error) return <p className="sub" role="alert">{error.message}</p>;
  if (id && !ada) return <Muat />;
  const draft = id ? ada.status === 'draft' : false;

  return (
    <div className="halaman admin-lebar">
      <Link to="/admin/periode" className="kembali">← Kembali ke Informasi Periode</Link>
      <header className="masuk"><h1 className="judul">{id ? 'Edit Periode' : 'Tambah Periode'}</h1></header>
      {galat && <p className="banner-galat" role="alert">{galat}</p>}

      <form ref={formRef} className="halaman" onSubmit={(e) => { e.preventDefault(); setKonfirmasi(id ? 'simpan' : 'publikasi'); }}>
        <section className="kartu">
          <h2>Informasi Umum</h2>
          <div className="grid-form">
            <label>Tahun Akademik *<input required placeholder="PTA 2026/2027" pattern="(ATA|PTA) \d{4}/\d{4}" title="ATA atau PTA diikuti TTTT/TTTT" maxLength={13} value={form.tahun_akademik} onChange={ubah('tahun_akademik')} /></label>
            <label>Semester *
              <select required value={form.semester} onChange={ubah('semester')}><option value="">Pilih semester</option><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></select>
            </label>
            <label>Gelombang *
              <select required value={form.gelombang} onChange={ubah('gelombang')}><option value="1">Gelombang 1</option><option value="2">Gelombang 2</option><option value="3">Gelombang 3</option></select>
            </label>
            <label>Nama Periode *<input required maxLength={100} placeholder="Magang Gelombang 1 2026/2027" value={form.nama_periode} onChange={ubah('nama_periode')} /></label>
            <label className="penuh">Deskripsi<input maxLength={2000} value={form.deskripsi} onChange={ubah('deskripsi')} /></label>
          </div>
        </section>

        <div className="tiga-kartu">
          <section className="kartu">
            <h2>Jadwal Surat Rekomendasi</h2>
            <div className="grid-form satu">
              <label>Mulai *<input type="date" required value={form.tgl_buka} onChange={ubah('tgl_buka')} /></label>
              <label>Berakhir *<input type="date" required min={form.tgl_buka} value={form.tgl_tutup} onChange={ubah('tgl_tutup')} /></label>
            </div>
          </section>
          <section className="kartu">
            <h2>Jadwal Konversi SKS</h2>
            <div className="grid-form satu">
              <label>Mulai<input type="date" min={form.tgl_tutup} value={form.tgl_buka_konversi} onChange={ubah('tgl_buka_konversi')} /></label>
              <label>Berakhir<input type="date" min={form.tgl_buka_konversi || form.tgl_tutup} value={form.batas_konversi} onChange={ubah('batas_konversi')} /></label>
            </div>
            <p className="catatan-kecil">Kosongkan tanggal mulai: konversi dibuka sehari setelah jadwal surat berakhir.</p>
          </section>
          <section className="kartu">
            <h2>Jadwal Dokumen Magang</h2>
            <div className="grid-form satu">
              <label>Mulai<input type="date" value={form.tgl_buka_dokumen} onChange={ubah('tgl_buka_dokumen')} /></label>
              <label>Deadline<input type="date" min={form.tgl_buka_dokumen} value={form.batas_laporan} onChange={ubah('batas_laporan')} /></label>
            </div>
          </section>
        </div>

        <section className="kartu">
          <h2>Ketentuan Magang</h2>
          <div className="grid-form empat">
            <label>Minimal Semester<input type="number" min="1" max="14" required value={form.min_semester} onChange={ubah('min_semester')} /></label>
            <label>Minimal IPK<input type="number" min="0" max="4" step="0.01" required value={form.min_ipk} onChange={ubah('min_ipk')} /></label>
            <label>Maks. Konversi<input readOnly value="2 kali" /></label>
            <label>Ketentuan Nilai<input readOnly value="Tidak ada nilai E" /></label>
          </div>
          <label style={{ marginTop: 16 }}>Ketentuan tambahan (opsional)<textarea rows={3} maxLength={2000} value={form.ketentuan} onChange={ubah('ketentuan')} /></label>
        </section>

        <div className="baris-aksi" style={{ justifyContent: 'flex-start' }}>
          <button className="btn garis" type="button" onClick={() => navigate('/admin/periode')}>Batal</button>
          {(!id || draft) && <button className="btn garis" type="button" disabled={sibuk} onClick={() => formRef.current.reportValidity() && simpan('draft')}>Simpan Draft</button>}
          <button className="btn kuning" type="submit" disabled={sibuk}>{sibuk ? 'Menyimpan…' : id ? 'Simpan Perubahan' : 'Publikasikan Periode'}</button>
        </div>
      </form>

      {konfirmasi && (
        <Dialog judul={konfirmasi === 'publikasi' ? 'Publikasikan Periode?' : 'Simpan Perubahan?'} onTutup={() => setKonfirmasi(null)}>
          <p className="isi">{konfirmasi === 'publikasi' ? 'Setelah dipublikasikan, periode ini menjadi periode berjalan dan terlihat oleh mahasiswa.' : 'Perubahan jadwal dan ketentuan langsung berlaku bagi mahasiswa.'}</p>
          <div className="dialog-aksi">
            <button className="btn garis" onClick={() => setKonfirmasi(null)}>Batal</button>
            <button className="btn isi" disabled={sibuk} onClick={async () => { await simpan(id ? ada.status : 'dipublikasikan'); setKonfirmasi(null); }}>{konfirmasi === 'publikasi' ? 'Publikasikan' : 'Simpan'}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
