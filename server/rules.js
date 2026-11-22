// Aturan bisnis SIGMA UG (SRS BR-01..BR-06). Dipakai semua peran; tidak bergantung pada Express.
export const BATAS_MAGANG = 2; // BR-03
export const BATAS_KIRIM_MINGGUAN = 3; // anti-spam: maks. kirim/kirim ulang per jenis pengajuan dalam 7 hari
export const MAKS_BERKAS = 2 * 1024 * 1024; // "PDF maks. 2 MB" (Figma UI-06)

// Dokumen syarat pengajuan surat rekomendasi (Figma UI-06 tahap 2).
export const DOKUMEN_REKOMENDASI = [
  { jenis: 'rangkuman_nilai', label: 'Rangkuman Nilai Terakhir', wajib: true },
  { jenis: 'bukti_pembayaran', label: 'Bukti Pembayaran', wajib: true },
  { jenis: 'surat_izin_orang_tua', label: 'Surat Izin Orang Tua', wajib: true },
  { jenis: 'contoh_surat_perusahaan', label: 'Contoh Surat Perusahaan', wajib: false },
];

// Dokumen akhir magang (SDD tabel 15). Logbook opsional: tetap lengkap tanpa logbook (BR-06).
export const DOKUMEN_AKHIR = [
  { jenis: 'laporan_akhir', label: 'Laporan Akhir (Bertanda Tangan)', wajib: true },
  { jenis: 'nilai_mitra', label: 'Nilai Akhir Mitra', wajib: true },
  { jenis: 'sertifikat', label: 'Sertifikat Magang', wajib: true },
  { jenis: 'logbook', label: 'Logbook', wajib: false },
];

const hari = (iso, offset = 0) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
export const hariIni = () => new Date().toISOString().slice(0, 10);

export const statusRentang = (buka, tutup, sekarang = hariIni()) =>
  sekarang < buka ? 'akan_dibuka' : sekarang <= tutup ? 'dibuka' : 'ditutup';

// FR-09: jendela konversi dimulai sehari setelah pengajuan surat ditutup, berakhir di batas_konversi (bila sudah ditetapkan).
export function jadwal(periode, sekarang) {
  const hasil = [{ jenis: 'pengajuan', buka: periode.tgl_buka, tutup: periode.tgl_tutup, status: statusRentang(periode.tgl_buka, periode.tgl_tutup, sekarang) }];
  if (periode.batas_konversi) {
    const buka = periode.tgl_buka_konversi ?? hari(periode.tgl_tutup, 1); // tanpa tanggal buka sendiri: sehari setelah pengajuan surat ditutup
    hasil.push({ jenis: 'konversi', buka, tutup: periode.batas_konversi, status: statusRentang(buka, periode.batas_konversi, sekarang) });
  }
  return hasil;
}

export const tanggalSah = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? '') && !Number.isNaN(Date.parse(s));
const teks = (v, maks) => {
  const t = (v ?? '').trim();
  return t.length > 0 && t.length <= maks;
};

// Setiap validator mengembalikan pesan kesalahan pertama, atau null bila sah.
export function validasiIdentitas(p) {
  if (!teks(p.nama, 60)) return 'Nama wajib diisi (maksimal 60 karakter).';
  if (!/^\d{8}$/.test(p.npm ?? '')) return 'NPM harus 8 digit angka.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email ?? '') || p.email.length > 100) return 'Alamat email tidak valid.';
  return null;
}

// US-02
export function validasiProfil(p) {
  const ipk = Number(p.ipk);
  if (p.ipk === '' || p.ipk == null || !(ipk >= 0 && ipk <= 4)) return 'IPK harus berada pada rentang 0 sampai 4.';
  if (!Number.isInteger(Number(p.jumlah_sks)) || Number(p.jumlah_sks) < 0) return 'Jumlah SKS harus berupa bilangan bulat.';
  if (!Number.isInteger(Number(p.semester)) || Number(p.semester) < 1) return 'Semester harus berupa bilangan bulat.';
  if (!/^08\d{8,11}$/.test(p.no_telepon ?? '')) return 'Nomor telepon harus 10–13 digit dan diawali 08.';
  if (!teks(p.alamat, 200) || p.alamat.trim().length < 10) return 'Alamat wajib diisi (10–200 karakter).';
  return null;
}

export function validasiRiwayat(r) {
  if (!teks(r.nama_perusahaan, 150)) return 'Nama perusahaan wajib diisi (maksimal 150 karakter).';
  if (!Number.isInteger(Number(r.tahun)) || Number(r.tahun) < 2000 || Number(r.tahun) > 2100) return 'Tahun magang tidak valid.';
  return null;
}

const validasiRentang = (b) => {
  if (!tanggalSah(b.tgl_mulai) || !tanggalSah(b.tgl_selesai)) return 'Tanggal mulai dan selesai wajib diisi.';
  if (b.tgl_selesai < b.tgl_mulai) return 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
  return null;
};

// FR-02 / UI-06 bagian B dan C.
export function validasiPengajuan(b, kategori) {
  if (!teks(b.nama_perusahaan, 150)) return 'Nama perusahaan wajib diisi (maksimal 150 karakter).';
  if (!teks(b.kepada, 100)) return 'Kolom Kepada / Jabatan wajib diisi (maksimal 100 karakter).';
  if (!teks(b.alamat_perusahaan, 500)) return 'Alamat perusahaan wajib diisi (maksimal 500 karakter).';
  if (!kategori.some((k) => k.id === Number(b.id_kategori))) return 'Pilih kategori perusahaan.';
  return validasiRentang(b);
}

// FR-06 / UI-08 informasi magang pada surat penerimaan.
export const validasiPenerimaan = (b) => (teks(b.posisi, 100) ? validasiRentang(b) : 'Posisi / divisi magang wajib diisi (maksimal 100 karakter).');

// Entri logbook harian (Figma: tanggal, jam, deskripsi aktivitas, hasil, kendala opsional). Tanggal harus dalam masa magang dan tidak di masa depan.
export function validasiLogbook(b, magang) {
  if (!tanggalSah(b.tanggal)) return 'Tanggal kegiatan wajib diisi.';
  if (b.tanggal < magang.tgl_mulai || b.tanggal > magang.tgl_selesai) return 'Tanggal kegiatan harus berada dalam periode magang Anda.';
  if (b.tanggal > hariIni()) return 'Tanggal kegiatan tidak boleh di masa depan.';
  const jam = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!jam.test(b.jam_mulai ?? '') || !jam.test(b.jam_selesai ?? '')) return 'Jam mulai dan jam selesai wajib diisi (format JJ:MM).';
  if (b.jam_selesai <= b.jam_mulai) return 'Jam selesai harus setelah jam mulai.';
  if (!teks(b.aktivitas, 1000)) return 'Deskripsi aktivitas wajib diisi (maksimal 1000 karakter).';
  if (!teks(b.hasil, 1000)) return 'Hasil atau pencapaian wajib diisi (maksimal 1000 karakter).';
  if (b.kendala && b.kendala.length > 500) return 'Kendala maksimal 500 karakter.';
  return null;
}

export function validasiPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return 'Berkas harus berupa PDF.';
  if (buffer.length > MAKS_BERKAS) return 'Ukuran berkas maksimal 2 MB.';
  return buffer.subarray(0, 4).toString('latin1') === '%PDF' ? null : 'Berkas harus berupa PDF.';
}

// Daftar syarat pengajuan (BR-02, BR-03). Ambang semester dan IPK diambil dari periode bila ada; bawaannya 5 dan 3.00 (SRS).
// `label` untuk tampilan "Cek Kelayakan", `gagal` untuk alasan penolakan.
export function syaratPengajuan(m, jumlahMagang, kategoriDiizinkan = true, periode = null) {
  const minSemester = periode?.min_semester ?? 5;
  const minIpk = Number(periode?.min_ipk ?? 3);
  return [
    { label: `Semester ${minSemester} atau lebih`, ok: m.semester >= minSemester, gagal: `Semester kurang dari ${minSemester}` },
    { label: 'Mahasiswa berstatus aktif', ok: !!m.status_aktif, gagal: 'Status mahasiswa tidak aktif' },
    { label: 'Tidak ada nilai E', ok: !m.ada_nilai_e, gagal: 'Memiliki nilai E' },
    { label: `IPK minimal ${minIpk.toFixed(2)}`, ok: m.ipk >= minIpk, gagal: `IPK di bawah ${minIpk.toFixed(2)}` },
    { label: 'Tidak pernah cuti', ok: !m.status_cuti, gagal: 'Pernah cuti kuliah' },
    { label: `Magang sebelumnya ${jumlahMagang} dari ${BATAS_MAGANG} kali`, ok: jumlahMagang < BATAS_MAGANG, gagal: `Sudah mengikuti magang ${BATAS_MAGANG} kali` },
    { label: 'Kategori perusahaan diizinkan', ok: kategoriDiizinkan, gagal: 'Kategori perusahaan tidak diizinkan' },
  ];
}

// "Cek Kelayakan" di halaman pengajuan mahasiswa (UI-06): syarat yang sudah bisa dinilai sebelum kategori perusahaan dipilih. Hanya petunjuk.
export const cekKelayakan = (m, jumlahMagang, periode) => syaratPengajuan(m, jumlahMagang, true, periode).slice(0, 6).map(({ label, ok }) => ({ label, ok }));

// Tampilan nomor dokumen: REK-2026-0001 (SDD tabel 9 dan 11).
export const nomorTampil = (kode, iso, id) => `${kode}-${iso.slice(0, 4)}-${String(id).padStart(4, '0')}`;

// FR-03: alasan bila pengajuan tidak memenuhi syarat (kosong = lolos). Data mahasiswa harus sudah diverifikasi sebelum dievaluasi.
export const evaluasiPengajuan = (m, kategoriDiizinkan, jumlahMagang, periode) => syaratPengajuan(m, jumlahMagang, kategoriDiizinkan, periode).filter((x) => !x.ok).map((x) => x.gagal);

// FR-09 / UI-16 (formulir "Tambah Periode"). Draft hanya wajib berisi identitas periode; dipublikasikan wajib berisi jadwal lengkap.
const TANGGAL_OPSIONAL = ['tgl_pengumuman', 'tgl_mulai_pelaksanaan', 'tgl_selesai_pelaksanaan', 'tgl_buka_konversi', 'batas_konversi', 'tgl_buka_dokumen', 'batas_laporan'];
export function validasiPeriode(p) {
  if (!/^(ATA|PTA) \d{4}\/\d{4}$/.test(p.tahun_akademik ?? '')) return 'Tahun akademik harus berformat ATA atau PTA diikuti TTTT/TTTT, contoh PTA 2026/2027.';
  if (![1, 2, 3].includes(Number(p.gelombang))) return 'Gelombang harus 1, 2, atau 3.';
  if (!teks(p.nama_periode, 100)) return 'Nama periode wajib diisi (maksimal 100 karakter).';
  if (!['Ganjil', 'Genap'].includes(p.semester)) return 'Pilih semester Ganjil atau Genap.';
  if ((p.deskripsi ?? '').length > 2000) return 'Deskripsi maksimal 2000 karakter.';
  if (!['draft', 'dipublikasikan'].includes(p.status ?? 'dipublikasikan')) return 'Status periode tidak valid.';
  if (!tanggalSah(p.tgl_buka) || !tanggalSah(p.tgl_tutup)) return 'Tanggal mulai dan berakhir jadwal surat rekomendasi wajib diisi.';
  if (p.tgl_tutup < p.tgl_buka) return 'Tanggal berakhir tidak boleh lebih awal dari tanggal mulai.';
  for (const k of TANGGAL_OPSIONAL) if (p[k] && !tanggalSah(p[k])) return `Tanggal ${k.replaceAll('_', ' ')} tidak valid.`;
  if (p.batas_konversi && p.batas_konversi <= p.tgl_tutup) return 'Jadwal konversi harus berakhir setelah jadwal surat rekomendasi.';
  if (p.tgl_buka_konversi && p.batas_konversi && p.batas_konversi < p.tgl_buka_konversi) return 'Jadwal konversi: tanggal berakhir tidak boleh lebih awal dari tanggal mulai.';
  if (p.tgl_buka_konversi && !p.batas_konversi) return 'Isi tanggal berakhir jadwal konversi.';
  if (p.tgl_buka_dokumen && p.batas_laporan && p.batas_laporan < p.tgl_buka_dokumen) return 'Jadwal dokumen magang: deadline tidak boleh lebih awal dari tanggal mulai.';
  if (p.tgl_mulai_pelaksanaan && p.tgl_selesai_pelaksanaan && p.tgl_selesai_pelaksanaan < p.tgl_mulai_pelaksanaan) return 'Akhir pelaksanaan tidak boleh lebih awal dari awal pelaksanaan.';
  const sem = Number(p.min_semester ?? 5), ipk = Number(p.min_ipk ?? 3);
  if (!Number.isInteger(sem) || sem < 1 || sem > 14) return 'Minimal semester harus 1–14.';
  if (!(ipk >= 0 && ipk <= 4)) return 'Minimal IPK harus 0–4.';
  if ((p.ketentuan ?? '').length > 2000) return 'Ketentuan maksimal 2000 karakter.';
  return null;
}

export function validasiMataKuliah(m) {
  if (!/^[A-Za-z0-9-]{3,15}$/.test((m.kode_mk ?? '').trim())) return 'Kode mata kuliah 3–15 karakter (huruf, angka, tanda hubung).';
  if (!teks(m.nama_mk, 50)) return 'Nama mata kuliah wajib diisi (maksimal 50 karakter).';
  if (!Number.isInteger(Number(m.sks)) || Number(m.sks) < 1 || Number(m.sks) > 6) return 'SKS harus 1–6.';
  return null;
}

// FR-07: baris hasil konversi = [{ id_matkul, sks_diakui }]; sks_diakui tidak boleh melebihi SKS mata kuliahnya (SDD tabel 13).
export function validasiHasilKonversi(baris, matkul) {
  if (!Array.isArray(baris) || baris.length === 0) return 'Pilih minimal satu mata kuliah.';
  const dipakai = new Set();
  for (const b of baris) {
    const mk = matkul.find((m) => m.id_matkul === Number(b.id_matkul));
    if (!mk) return 'Mata kuliah tidak ditemukan.';
    if (dipakai.has(mk.id_matkul)) return `Mata kuliah ${mk.kode_mk} dipilih lebih dari sekali.`;
    dipakai.add(mk.id_matkul);
    const sks = Number(b.sks_diakui);
    if (!Number.isInteger(sks) || sks < 1) return `SKS diakui untuk ${mk.kode_mk} wajib diisi.`;
    if (sks > mk.sks) return `SKS diakui untuk ${mk.kode_mk} tidak boleh melebihi ${mk.sks}.`;
    if ((b.keterangan ?? '').length > 200) return 'Keterangan maksimal 200 karakter.';
  }
  return null;
}

export const alasanSah = (a) => ((a ?? '').trim().length >= 5 && a.trim().length <= 500 ? null : 'Alasan penolakan wajib diisi (5–500 karakter).');

// Manajemen Akun: pembuatan akun Dosen Pendamping oleh admin.
export function validasiAkunDosen(d) {
  if (!teks(d.nama, 60)) return 'Nama wajib diisi (maksimal 60 karakter).';
  if (!/^[0-9A-Za-z]{5,20}$/.test((d.nidn ?? '').trim())) return 'NIDN harus 5–20 karakter (huruf atau angka).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((d.email ?? '').trim()) || d.email.trim().length > 100) return 'Alamat email tidak valid.';
  if (!/^08\d{8,11}$/.test(d.no_telepon ?? '')) return 'Nomor telepon harus 10–13 digit dan diawali 08.';
  if ((d.password ?? '').length < 8 || d.password.length > 72) return 'Kata sandi awal minimal 8 karakter.';
  return null;
}
