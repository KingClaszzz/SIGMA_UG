import Muat from '../components/Muat.jsx';
// PERAN: ADMIN PRODI — riwayat pengiriman notifikasi email (FR-17, SDD Tabel 18) & fitur kirim ulang bila gagal.
import { useState } from 'react';
import { api, useAksi, useApi } from '../api';
import { tanggalAngka } from '../format';

const EVENT_NAMA = {
  pengajuan_terkirim: 'Pengajuan Rekomendasi',
  surat_terbit: 'Surat Rekomendasi Terbit',
  rekomendasi_perbaikan: 'Perbaikan Rekomendasi',
  rekomendasi_ditolak: 'Penolakan Rekomendasi',
  konversi_terkirim: 'Pengajuan Konversi',
  konversi_ditolak: 'Penolakan Konversi',
  surat_konversi_terbit: 'Surat Konversi Terbit',
  dosen_ditetapkan: 'Penugasan Dosen',
  dokumen_disetujui: 'Dokumen Disetujui',
  dokumen_perbaikan: 'Perbaikan Dokumen',
  laporan_ditandatangani: 'Laporan Ditandatangani',
};

export default function NotifikasiEmail() {
  const [cari, setCari] = useState('');
  const [status, setStatus] = useState('semua');
  const { data, error, muat } = useApi(`/admin/notifikasi-email?status=${status}&q=${encodeURIComponent(cari)}`);
  const { sibuk, galat, jalan } = useAksi(muat);
  const s = data?.stat;

  return (
    <div className="halaman admin-lebar">
      <header className="halaman-kepala masuk">
        <div>
          <h1 className="judul">Log Pengiriman Email</h1>
          <p className="sub">Catatan notifikasi email otomatis ke mahasiswa. Email yang gagal terkirim dapat dikirim ulang.</p>
        </div>
        {s?.gagal > 0 && (
          <button
            type="button"
            className="btn kuning"
            disabled={sibuk}
            onClick={() => jalan(
              () => api('/admin/notifikasi-email/kirim-ulang-gagal', { method: 'POST' }),
              (r) => ({ judul: 'Kirim ulang selesai', teks: `${r.terkirim} dari ${r.total} email berhasil dikirim.` }),
            )}
          >
            {sibuk ? 'Mengirim…' : `Kirim Ulang Semua Gagal (${s.gagal})`}
          </button>
        )}
      </header>

      <section className="tiga-kartu">
        <div className="stat-kartu"><span className="angka">{s?.total ?? '–'}</span><span>Total Tercatat (200 Terbaru)</span></div>
        <div className="stat-kartu"><span className="angka">{s?.terkirim ?? '–'}</span><span>Berhasil Terkirim</span></div>
        <div className="stat-kartu"><span className={`angka${s?.gagal > 0 ? ' perlu' : ''}`}>{s?.gagal ?? '–'}</span><span>Gagal Terkirim</span></div>
      </section>

      {galat && <p className="banner-galat" role="alert">{galat}</p>}

      <section className="kartu">
        <div className="alat-tabel">
          <input type="search" placeholder="Cari nama, email, atau subjek…" aria-label="Cari log email" value={cari} onChange={(e) => setCari(e.target.value)} />
          <select aria-label="Status kirim" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="semua">Semua Status</option>
            <option value="terkirim">Terkirim</option>
            <option value="gagal">Gagal</option>
          </select>
        </div>

        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : data.data.length === 0 ? (
          <p className="kosong">Belum ada catatan email yang cocok.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Penerima</th><th>Event</th><th>Subjek</th><th>Waktu Kirim</th><th>Status</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {data.data.map((x) => (
                  <tr key={x.id_notifikasi}>
                    <td>{x.nama}<small className="kecil-abu">{x.email}</small></td>
                    <td>{EVENT_NAMA[x.jenis_event] ?? x.jenis_event}</td>
                    <td>{x.subjek}</td>
                    <td>{x.dikirim_pada ? tanggalAngka(x.dikirim_pada) : '–'}</td>
                    <td><span className={`badge ${x.status_kirim === 'terkirim' ? 'hijau' : 'merah'}`}>{x.status_kirim === 'terkirim' ? 'Terkirim' : 'Gagal'}</span></td>
                    <td>
                      {x.status_kirim === 'gagal' && (
                        <button
                          type="button"
                          className="btn garis kecil"
                          disabled={sibuk}
                          onClick={() => jalan(
                            () => api(`/admin/notifikasi-email/${x.id_notifikasi}/kirim-ulang`, { method: 'POST' }),
                            (r) => (r.ok ? { judul: 'Email terkirim', teks: x.email } : { jenis: 'galat', judul: 'Pengiriman masih gagal', teks: 'Periksa konfigurasi SMTP di server.' }),
                          )}
                        >
                          Kirim Ulang
                        </button>
                      )}
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
