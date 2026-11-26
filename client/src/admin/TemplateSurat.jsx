import Muat from '../components/Muat.jsx';
// PERAN: ADMIN PRODI — manajemen template surat rekomendasi & konversi (NFR-06; SDD tabel 16).
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, unduhBerkas, useAksi, useApi } from '../api';

const TAB = [['semua', 'Semua'], ['rekomendasi', 'Surat Rekomendasi'], ['konversi', 'Surat Konversi']];
const LABEL_JENIS = { rekomendasi: 'Surat Rekomendasi', konversi: 'Surat Konversi' };

export default function TemplateSurat() {
  const [params, setParams] = useSearchParams();
  const tabAwal = TAB.some(([k]) => k === params.get('jenis')) ? params.get('jenis') : 'semua';
  const [jenisFilter, setJenisFilter] = useState(tabAwal);
  const { data, error, muat } = useApi('/admin/template-surat');
  const [form, setForm] = useState({
    jenis_surat: tabAwal === 'konversi' ? 'konversi' : 'rekomendasi',
    nama_template: '',
    isi_template: '',
    aktifkan: true,
  });
  const { sibuk, galat, jalan } = useAksi(muat);

  const daftar = data?.filter((t) => jenisFilter === 'semua' || t.jenis_surat === jenisFilter) ?? [];
  const ubahTab = (k) => {
    setJenisFilter(k);
    setParams(k === 'semua' ? {} : { jenis: k });
    if (k !== 'semua') setForm((f) => ({ ...f, jenis_surat: k }));
  };

  const muatDariBerkas = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isi = await file.text();
    const dasar = file.name.replace(/\.[^.]+$/, '').slice(0, 100);
    setForm((f) => ({ ...f, nama_template: f.nama_template || dasar, isi_template: isi }));
    e.target.value = '';
  };

  const salinKeEditor = (t) => jalan(async () => {
    const detail = await api(`/admin/template-surat/${t.id}/isi`);
    setForm((f) => ({
      ...f,
      jenis_surat: detail.jenis_surat,
      nama_template: `${detail.nama_template} (Salinan)`.slice(0, 100),
      isi_template: detail.isi_template,
    }));
  }, { judul: 'Isi template disalin ke editor', teks: 'Silakan sesuaikan teks lalu simpan sebagai template baru.' });

  return (
    <div className="halaman" style={{ maxWidth: 1020 }}>
      <Link to="/admin/profil" className="kembali">← Kembali ke Profil</Link>
      <header className="masuk">
        <h1 className="judul">Template Surat</h1>
        <p className="sub">Kelola template teks (.txt) untuk penerbitan PDF Surat Rekomendasi dan Surat Konversi SKS.</p>
      </header>

      <section className="kartu">
        <h2>Daftar template</h2>
        <div className="tab-garis">
          {TAB.map(([k, label]) => (
            <button key={k} type="button" className={jenisFilter === k ? 'aktif' : ''} onClick={() => ubahTab(k)}>{label}</button>
          ))}
        </div>
        {error ? <p className="pesan galat" role="alert">{error.message}</p> : !data ? <Muat /> : daftar.length === 0 ? (
          <p className="kosong">Belum ada template surat.</p>
        ) : (
          <div className="tabel-wrap">
            <table>
              <thead><tr><th>Nama Template</th><th>Jenis Surat</th><th>Status</th><th>Dipakai</th><th><span className="sr">Aksi</span></th></tr></thead>
              <tbody>
                {daftar.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.nama_template}
                      {t.bawaan && <small className="kecil-abu">Template bawaan sistem</small>}
                    </td>
                    <td>{LABEL_JENIS[t.jenis_surat] ?? t.jenis_surat}</td>
                    <td><span className={`badge ${t.is_aktif ? 'hijau' : 'abu'}`}>{t.is_aktif ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td>{t.dipakai} surat</td>
                    <td className="td-aksi">
                      {!t.is_aktif && (
                        <button
                          type="button"
                          className="btn isi kecil"
                          disabled={sibuk}
                          onClick={() => jalan(() => api(`/admin/template-surat/${t.id}/aktifkan`, { method: 'PUT' }), { judul: 'Template diaktifkan' })}
                        >
                          Aktifkan
                        </button>
                      )}
                      <button type="button" className="btn garis kecil" disabled={sibuk} onClick={() => salinKeEditor(t)}>Salin ke Editor</button>
                      <button
                        type="button"
                        className="btn garis kecil"
                        onClick={() => unduhBerkas(`/admin/template-surat/${t.id}/isi?unduh=1`, `${t.jenis_surat}-${t.id}.txt`)}
                      >
                        Unduh (.txt)
                      </button>
                      {!t.bawaan && (
                        <button
                          type="button"
                          className="btn garis kecil bahaya"
                          disabled={sibuk || t.is_aktif || t.dipakai > 0}
                          title={t.is_aktif ? 'Template aktif tidak dapat dihapus' : t.dipakai > 0 ? 'Sudah dipakai surat terbit' : undefined}
                          onClick={() => jalan(() => api(`/admin/template-surat/${t.id}`, { method: 'DELETE' }), { judul: 'Template dihapus' })}
                        >
                          Hapus
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

      <form
        className="kartu"
        onSubmit={(e) => {
          e.preventDefault();
          jalan(async () => {
            await api('/admin/template-surat', { method: 'POST', body: form });
            setForm((f) => ({ ...f, nama_template: '', isi_template: '' }));
          }, { judul: 'Template surat disimpan' });
        }}
      >
        <h2>Tambah template baru</h2>
        <div className="grid-form">
          <label>
            Jenis surat *
            <select value={form.jenis_surat} onChange={(e) => setForm({ ...form, jenis_surat: e.target.value })}>
              <option value="rekomendasi">Surat Rekomendasi</option>
              <option value="konversi">Surat Konversi</option>
            </select>
          </label>
          <label>
            Nama template *
            <input required maxLength={100} placeholder="Contoh: Surat Rekomendasi 2026 Rev 1" value={form.nama_template} onChange={(e) => setForm({ ...form, nama_template: e.target.value })} />
          </label>
          <label className="penuh">
            Muat dari berkas .txt (opsional)
            <input type="file" accept=".txt,text/plain" onChange={muatDariBerkas} />
          </label>
          <label className="penuh">
            Isi template (.txt) *
            <textarea
              rows={12}
              required
              placeholder={`@profil ${form.jenis_surat}\n\n@kop\nUNIVERSITAS GUNADARMA\nSK. No. 92/DIKTI/Kep/1996`}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
              value={form.isi_template}
              onChange={(e) => setForm({ ...form, isi_template: e.target.value })}
            />
          </label>
          <label className="penuh" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={form.aktifkan} onChange={(e) => setForm({ ...form, aktifkan: e.target.checked })} />
            Langsung aktifkan sebagai template resmi setelah disimpan
          </label>
        </div>

        <details style={{ marginTop: 12, fontSize: 13, color: 'var(--blue-42)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Panduan format template</summary>
          <p style={{ marginTop: 8, lineHeight: 1.6 }}>
            Klik <strong>Salin ke Editor</strong> pada template bawaan untuk melihat susunan lengkap. Pastikan baris pertama berisi <code>@profil rekomendasi</code> atau <code>@profil konversi</code>, serta arahan seperti <code>@kop</code>, <code>@judul</code>, <code>@baris</code>, dan variabel seperti <code>{'{{nomor_surat}}'}</code>, <code>{'{{nama}}'}</code>, <code>{'{{npm}}'}</code>.
          </p>
        </details>

        {galat && <p className="pesan galat" role="alert" style={{ marginTop: 14 }}>{galat}</p>}
        <div className="baris-aksi"><span /><button className="btn isi" type="submit" disabled={sibuk}>Simpan Template</button></div>
      </form>
    </div>
  );
}
