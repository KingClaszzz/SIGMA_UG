import Muat from '../components/Muat.jsx';
// PERAN: ADMIN PRODI — surat rekomendasi (FR-03, FR-04, FR-05).
// Menyetujui pengajuan = surat langsung terbit (tidak ada langkah terbit terpisah). Daftar: cari, filter status, validasi massal (FR-04).
// Detail: pemeriksaan per pengajuan (setujui, minta perbaikan, tolak) atau ringkasan pengajuan yang sudah disetujui.
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, useAksi, useApi } from '../api';
import Badge from '../components/Badge.jsx';
import Dialog from '../components/Dialog.jsx';
import TautanBerkas from '../components/Berkas.jsx';
import DaftarPratinjau from '../components/Pratinjau.jsx';
import RiwayatStatus from '../components/RiwayatStatus.jsx';
import { tanggalAngka, tanggalPanjang } from '../format';

const FILTER = [['semua', 'Semua Status'], ['diajukan', 'Menunggu Pemeriksaan'], ['diterbitkan', 'Disetujui'], ['perbaikan', 'Perlu Perbaikan'], ['ditolak', 'Ditolak']];
const DOKUMEN = [['rangkuman_nilai', 'Rangkuman nilai terakhir'], ['surat_izin_orang_tua', 'Surat izin orang tua'], ['bukti_pembayaran', 'Bukti pembayaran'], ['contoh_surat_perusahaan', 'Contoh surat perusahaan (opsional)']];

// Pengajuan yang dikembalikan ke mahasiswa berstatus draft di server; di sini tampil sebagai "Perlu Perbaikan".
const StatusRek = ({ p }) => (p.status === 'draft' ? <Badge nilai="draft" label="Perlu Perbaikan" /> : <Badge nilai={p.status} label={{ diajukan: 'Menunggu Pemeriksaan', diterbitkan: 'Disetujui' }[p.status]} />);

function HasilMassal({ hasil, onTutup }) {
  const gaya = { disetujui: 'ok', ditolak: 'tidak', dilewati: 'lewat' };
  return (
    <div className="banner-info" role="status">
      <strong>Hasil proses ({hasil.length} pengajuan)</strong>
      <ul className="hasil-massal">
        {hasil.map((h) => (
          <li key={h.id} className={gaya[h.hasil]}>#{h.id} · {h.hasil}{h.nomor_surat ? ` (surat ${h.nomor_surat})` : ''}{h.alasan ? ` — ${h.alasan}` : ''}</li>
        ))}
      </ul>
      <button type="button" className="aksi-kecil" onClick={onTutup}>Tutup</button>
    </div>
  );
}

export function DaftarRekomendasi() {
  const [params, setParams] = useSearchParams();
  const status = FILTER.some(([k]) => k === params.get('status')) ? params.get('status') : 'semua';
  const [cari, setCari] = useState('');
  const { data, error, muat } = useApi(`/admin/rekomendasi?status=${status}&q=${encodeURIComponent(cari)}`);
  const [pilih, setPilih] = useState(new Set());
  const [hasil, setHasil] = useState(null);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const { sibuk, galat, jalan } = useAksi(muat);

  const ganti = (k) => { setParams({ status: k }); setPilih(new Set()); setHasil(null); };
  const ids = [...pilih];
  const bisaDipilih = (p) => p.status === 'diajukan';
  const centang = (id) => setPilih((s) => { const b = new Set(s); if (b.has(id)) b.delete(id); else b.add(id); return b; });
  const dapatDipilih = data?.filter(bisaDipilih) ?? [];
  const semua = dapatDipilih.length > 0 && dapatDipilih.every((p) => pilih.has(p.id));
  const proses = () => jalan(async () => { const h = (await api('/admin/rekomendasi/validasi', { method: 'POST', body: { ids } })).hasil; setHasil(h); setPilih(new Set()); setKonfirmasi(false); return h; },
    (h) => ({ judul: 'Validasi selesai', teks: ['disetujui', 'ditolak', 'dilewati'].map((k) => `${h.filter((x) => x.hasil === k).length} ${k}`).join(', ') }));

  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">Pengajuan Surat Rekomendasi</h1>
        <p className="sub">Periksa pengajuan mahasiswa. Pengajuan yang disetujui langsung diterbitkan suratnya. Pilih beberapa baris untuk memvalidasi sekaligus.</p>
      </header>

      {hasil && <HasilMassal hasil={hasil} onTutup={() => setHasil(null)} />}
      {galat && <p className="banner-galat" role="alert">{galat}</p>}
      {ids.length > 0 && (
        <div className="bar-aksi">
          <span><strong>{ids.length}</strong> pengajuan dipilih</span>
          <div className="kanan">
            <button className="btn isi kecil" disabled={sibuk} onClick={() => setKonfirmasi(true)}>Validasi Terpilih</button>
            <button className="btn garis kecil" onClick={() => setPilih(new Set())}>Batal</button>
          </div>
        </div>
      )}

      <section className="kartu">
        <div className="alat-tabel">
          <input type="search" placeholder="Cari nama, NPM, atau perusahaan…" aria-label="Cari pengajuan" value={cari} onChange={(e) => setCari(e.target.value)} />
          <select aria-label="Status pengajuan" value={status} onChange={(e) => ganti(e.target.value)}>
            {FILTER.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.length === 0 ? (
          <p className="kosong">Tidak ada pengajuan yang cocok.</p>
        ) : (
          <div className="tabel-wrap">
            <table className="tabel-admin">
              <thead>
                <tr>
                  <th>{dapatDipilih.length > 0 && <input type="checkbox" aria-label="Pilih semua" checked={semua} onChange={() => setPilih(semua ? new Set() : new Set(dapatDipilih.map((p) => p.id)))} />}</th>
                  <th>No</th><th>Nama Mahasiswa</th><th>NPM</th><th>Program Studi</th><th>Perusahaan Tujuan</th><th>Tanggal Pengajuan</th><th>Status</th><th><span className="sr">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {data.map((p, i) => (
                  <tr key={p.id} className={pilih.has(p.id) ? 'dipilih' : ''}>
                    <td>{bisaDipilih(p) && <input type="checkbox" aria-label={`Pilih ${p.mahasiswa.nama}`} checked={pilih.has(p.id)} onChange={() => centang(p.id)} />}</td>
                    <td>{i + 1}</td>
                    <td>{p.mahasiswa.nama}</td>
                    <td>{p.mahasiswa.npm}</td>
                    <td>Sistem Informasi</td>
                    <td>{p.nama_perusahaan}</td>
                    <td>{tanggalAngka(p.diajukan_pada)}</td>
                    <td><StatusRek p={p} /></td>
                    <td><Link className="btn garis kecil" to={`/admin/rekomendasi/${p.id}`}>{p.status === 'diajukan' ? 'Periksa' : p.status === 'diterbitkan' ? 'Lihat Surat' : 'Detail'}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {konfirmasi && (
        <Dialog judul="Validasi Pengajuan Terpilih?" onTutup={() => setKonfirmasi(false)}>
          <p className="isi">Pengajuan yang memenuhi syarat langsung disetujui dan suratnya diterbitkan. Yang tidak memenuhi syarat ditolak beserta alasannya. Pengajuan dengan data diri belum diverifikasi dilewati.</p>
          <div className="dialog-aksi">
            <button className="btn garis" onClick={() => setKonfirmasi(false)}>Batal</button>
            <button className="btn isi" disabled={sibuk} onClick={proses}>{sibuk ? 'Memproses…' : `Validasi ${ids.length} Pengajuan`}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// Status satu syarat pada tabel "Informasi Akademik": data yang belum diverifikasi tidak dinilai.
function StatusSyarat({ ok, terverifikasi }) {
  if (!terverifikasi) return <span className="badge kuning">Belum diverifikasi</span>;
  return ok ? <span className="badge hijau">Sesuai</span> : <span className="badge merah">Tidak sesuai</span>;
}

export function DetailRekomendasiAdmin() {
  const { id } = useParams();
  const { data: p, error, muat } = useApi(`/admin/rekomendasi/${id}`);
  const [catatan, setCatatan] = useState('');
  const [mode, setMode] = useState(null); // 'setuju' | 'perbaikan' | 'tolak' | null
  const { sibuk, galat, jalan } = useAksi(muat);
  const kirim = (rute, body, pesan) => jalan(async () => { await api(`/admin/rekomendasi/${rute}`, { method: 'POST', body }); setMode(null); setCatatan(''); }, pesan);

  if (error) return <p className="sub" role="alert">{error.message}</p>;
  if (!p) return <Muat />;
  const m = p.mahasiswa;
  const terverifikasi = m.status_verifikasi === 'terverifikasi';
  const berkas = DOKUMEN.map(([jenis, label]) => {
    const d = p.dokumen.find((x) => x.jenis === jenis);
    return { kunci: jenis, label, nama: d?.nama, pada: d?.diunggah_pada, path: d ? `/admin/rekomendasi/${p.id}/dokumen/${jenis}` : null };
  });
  const terbit = p.status === 'diterbitkan';

  return (
    <div className="halaman admin-lebar">
      <header className="masuk">
        <h1 className="judul">{terbit ? 'Detail Pengajuan Surat Rekomendasi' : 'Detail Pemeriksaan Surat Rekomendasi'}</h1>
        <p className="sub">Pengajuan {m.nama} · {tanggalAngka(p.diajukan_pada)} · {p.nomor}</p>
      </header>
      <Link to="/admin/rekomendasi" className="kembali">← Kembali ke daftar</Link>
      {galat && <p className="banner-galat" role="alert">{galat}</p>}
      {p.status === 'ditolak' && <p className="banner-galat" role="status"><strong>Pengajuan ditolak</strong>{p.alasan_penolakan}</p>}
      {p.status === 'draft' && <p className="banner-peringatan" role="status"><strong>Perlu perbaikan dari mahasiswa</strong>{p.alasan_penolakan}</p>}

      <div className="dua-kolom-admin">
        <div className="kolom-samping">
          <section className="kartu">
            <h2>Informasi Mahasiswa</h2>
            <dl className="kv-polos">
              <div><dt>Nama</dt><dd>{m.nama}</dd></div>
              <div><dt>NPM</dt><dd>{m.npm}</dd></div>
              <div><dt>Semester / TA</dt><dd>{m.semester}{p.tahun_akademik ? ` / ${p.tahun_akademik}` : ''}</dd></div>
              <div><dt>Program Studi</dt><dd>Sistem Informasi</dd></div>
              <div><dt>Fakultas</dt><dd>FIKTI</dd></div>
              <div><dt>No. HP</dt><dd>{m.no_telepon}</dd></div>
              <div className="lebar"><dt>Email</dt><dd>{m.email}</dd></div>
            </dl>
            <div className="baris-kecil">
              <Badge nilai={m.status_verifikasi} />
              <Link to={`/admin/mahasiswa/${m.id}`} className="aksi-kecil">{terverifikasi ? 'Lihat data diri' : 'Verifikasi data diri'}</Link>
            </div>
          </section>

          {!terbit && (
            <section className="kartu">
              <h2>Informasi Akademik (data awal dari mahasiswa)</h2>
              <div className="tabel-wrap">
                <table>
                  <thead><tr><th>Persyaratan</th><th>Status verifikasi</th></tr></thead>
                  <tbody>
                    {p.syarat.daftar.map((x) => (
                      <tr key={x.label}>
                        <td>{x.label}{x.label.startsWith('IPK') ? ` (diinput mahasiswa: ${Number(m.ipk).toFixed(2)})` : ''}</td>
                        <td><StatusSyarat ok={x.ok} terverifikasi={terverifikasi} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="banner-info" style={{ marginTop: 14 }}>Data diinput mahasiswa dan wajib diverifikasi Admin dari sumber akademik resmi di luar sistem. SIGMA UG tidak terhubung ke StudentSite.</p>
            </section>
          )}

          <section className="kartu">
            <h2>Dokumen Pendukung</h2>
            <DaftarPratinjau berkas={berkas} />
          </section>
        </div>

        <div className="kolom-samping">
          <section className="kartu">
            <h2>Informasi Perusahaan Tujuan</h2>
            <dl className="kv-polos">
              <div><dt>Perusahaan</dt><dd>{p.nama_perusahaan}</dd></div>
              <div><dt>Kepada</dt><dd>{p.kepada}</dd></div>
              <div><dt>Kategori</dt><dd>{p.kategori}</dd></div>
              <div><dt>Rencana magang</dt><dd>{tanggalPanjang(p.tgl_mulai)} s.d. {tanggalPanjang(p.tgl_selesai)}</dd></div>
              <div className="lebar"><dt>Alamat</dt><dd>{p.alamat_perusahaan}</dd></div>
            </dl>
          </section>

          {terbit ? (
            <>
              <section className="kartu">
                <h2>Status Pengajuan</h2>
                <div className="baris-kecil" style={{ marginTop: 0 }}><Badge nilai="diterbitkan" label="Disetujui" /></div>
                <dl className="kv-polos satu-kolom" style={{ marginTop: 12 }}>
                  <div><dt>Diperiksa oleh</dt><dd>{p.admin_pemeriksa ?? '–'}</dd></div>
                  <div><dt>Tanggal persetujuan</dt><dd>{p.disetujui_pada ? tanggalPanjang(p.disetujui_pada) : '–'}</dd></div>
                  <div><dt>Nomor surat</dt><dd>{p.surat?.nomor_surat}</dd></div>
                </dl>
              </section>
              <section className="kartu">
                <h2>Riwayat Perubahan Status</h2>
                <RiwayatStatus item={p.riwayat_detail} />
              </section>
              <section className="kartu">
                <h2>Preview Surat</h2>
                <TautanBerkas className="btn isi" path={`/admin/rekomendasi/${p.id}/surat`}>Lihat Surat (PDF)</TautanBerkas>
              </section>
            </>
          ) : (
            <>
              <section className="kartu">
                <h2>Keputusan Pemeriksaan</h2>
                {p.status === 'diajukan' && (
                  <div className="aksi-keputusan">
                    <button className="btn isi" disabled={sibuk || !terverifikasi || !p.syarat.lolos} title={!terverifikasi ? 'Verifikasi data diri mahasiswa dulu' : !p.syarat.lolos ? 'Ada syarat yang belum terpenuhi' : ''} onClick={() => setMode('setuju')}>Setujui Pengajuan</button>
                    <button className="btn garis" disabled={sibuk} onClick={() => setMode(mode === 'perbaikan' ? null : 'perbaikan')}>Minta Perbaikan</button>
                    <button className="btn garis bahaya" disabled={sibuk} onClick={() => setMode(mode === 'tolak' ? null : 'tolak')}>Tolak Pengajuan</button>
                  </div>
                )}
                {p.status === 'ditolak' && <p className="isi">Pengajuan ini sudah ditolak. Mahasiswa bisa mengajukan ulang.</p>}
                {p.status === 'draft' && <p className="isi">Pengajuan dikembalikan ke mahasiswa untuk diperbaiki.</p>}
                {!terverifikasi && p.status === 'diajukan' && <p className="catatan-kecil">Verifikasi data diri mahasiswa terlebih dahulu sebelum menyetujui.</p>}
                {(mode === 'perbaikan' || mode === 'tolak') && (
                  <form className="aksi-form" onSubmit={(e) => { e.preventDefault(); kirim(`${p.id}/${mode === 'tolak' ? 'tolak' : 'perbaikan'}`, mode === 'tolak' ? { alasan: catatan } : { catatan }, mode === 'tolak' ? { judul: 'Pengajuan ditolak', teks: 'Alasan penolakan dikirim ke mahasiswa.' } : { judul: 'Perbaikan diminta', teks: 'Pengajuan dikembalikan ke mahasiswa beserta catatan.' }); }}>
                    <label>{mode === 'tolak' ? 'Alasan penolakan' : 'Catatan perbaikan'}
                      <textarea rows={3} required minLength={5} maxLength={500} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Ditampilkan kepada mahasiswa" />
                    </label>
                    <button className={`btn ${mode === 'tolak' ? 'garis bahaya' : 'isi'}`} type="submit" disabled={sibuk} style={{ justifySelf: 'start' }}>{mode === 'tolak' ? 'Kirim Penolakan' : 'Kirim Permintaan Perbaikan'}</button>
                  </form>
                )}
              </section>
              {p.riwayat_detail.length > 0 && <section className="kartu"><h2>Riwayat Perubahan Status</h2><RiwayatStatus item={p.riwayat_detail} /></section>}
            </>
          )}
        </div>
      </div>

      {mode === 'setuju' && (
        <Dialog judul="Setujui Pengajuan?" onTutup={() => setMode(null)}>
          <p className="isi">Surat rekomendasi untuk <strong>{m.nama}</strong> akan langsung diterbitkan dan bisa diunduh mahasiswa.</p>
          <div className="dialog-aksi">
            <button className="btn garis" onClick={() => setMode(null)}>Batal</button>
            <button className="btn isi" disabled={sibuk} onClick={() => kirim(`${p.id}/setujui`, undefined, { judul: 'Pengajuan disetujui', teks: 'Surat rekomendasi sudah diterbitkan.' })}>{sibuk ? 'Menerbitkan…' : 'Setujui dan Terbitkan'}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
