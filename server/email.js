// Pengiriman notifikasi email via SMTP (FR-17, SDD Tabel 18 notifikasi_email).
// Gagal kirim email dicatat sebagai status_kirim = 'gagal' tanpa membatalkan transaksi bisnis utama,
// dan dapat dikirim ulang oleh Admin Prodi tanpa menambah kolom di tabel notifikasi_email.
import nodemailer from 'nodemailer';

const EVENT_LABEL = {
  pengajuan_terkirim: 'Pengajuan surat rekomendasi berhasil dikirim ke Program Studi.',
  surat_terbit: 'Surat rekomendasi magang Anda telah diterbitkan dan siap diunduh.',
  rekomendasi_perbaikan: 'Pengajuan surat rekomendasi Anda memerlukan perbaikan. Silakan periksa catatan di SIGMA UG.',
  rekomendasi_ditolak: 'Pengajuan surat rekomendasi Anda ditolak. Silakan periksa alasan penolakan di SIGMA UG.',
  konversi_terkirim: 'Pengajuan konversi SKS Anda berhasil dikirim ke Program Studi.',
  konversi_ditolak: 'Pengajuan konversi SKS Anda ditolak. Silakan periksa alasan penolakan di SIGMA UG.',
  surat_konversi_terbit: 'Hasil konversi SKS dan surat konversi Anda telah diterbitkan dan siap diunduh.',
  dosen_ditetapkan: 'Dosen pendamping magang Anda telah ditetapkan oleh Admin Prodi.',
  dokumen_disetujui: 'Dokumen magang Anda telah disetujui oleh Dosen Pendamping.',
  dokumen_perbaikan: 'Dokumen magang Anda memerlukan perbaikan. Silakan cek catatan dan batas revisi dari Dosen Pendamping.',
  laporan_ditandatangani: 'Laporan akhir magang Anda telah ditandatangani oleh Dosen Pendamping dan siap diunduh.',
};

export function buatPengirimSmtp(env = process.env) {
  const { SMTP_HOST, SMTP_PORT = '587', SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 587;
  const secure = SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465;
  const transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  const from = SMTP_FROM || `SIGMA UG <${SMTP_USER}>`;
  return async ({ to, subject, text }) => transport.sendMail({ from, to, subject, text });
}

function susunIsi({ nama, subjek, pesan, appUrl }) {
  const tautan = appUrl ? `\nBuka SIGMA UG: ${appUrl}` : '';
  return `Halo ${nama || 'Mahasiswa'},\n\n${pesan}\n${tautan}\n\n--\nSIGMA UG · Program Studi Sistem Informasi\nUniversitas Gunadarma\n(Pesan otomatis, mohon tidak membalas email ini)`;
}

export function buatLayananEmail({ db, kirimEmail = null, appUrl = process.env.APP_URL || process.env.CLIENT_URL || '' }) {
  async function eksekusiKirim({ to, subject, text }) {
    if (!kirimEmail) return false;
    try {
      await kirimEmail({ to, subject, text });
      return true;
    } catch (e) {
      console.error('Gagal mengirim email notifikasi:', e?.message ?? e);
      return false;
    }
  }

  // Mengirim email lalu mencatat hasil ke tabel notifikasi_email (tidak pernah melempar galat ke pemanggil).
  async function kirim({ idUser, email, nama, jenisEvent, subjek, pesan }) {
    if (!idUser || !email) return null;
    const event = String(jenisEvent).slice(0, 30);
    const judul = String(subjek).slice(0, 150);
    const ok = await eksekusiKirim({
      to: email,
      subject: judul,
      text: susunIsi({ nama, subjek: judul, pesan: pesan ?? EVENT_LABEL[event] ?? judul, appUrl }),
    });
    const status = ok ? 'terkirim' : 'gagal';
    try {
      const { rows: [row] } = await db.query(
        'INSERT INTO notifikasi_email (id_user, jenis_event, subjek, status_kirim, dikirim_pada) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [idUser, event, judul, status, ok ? new Date() : null],
      );
      return row;
    } catch (e) {
      console.error('Gagal mencatat log notifikasi_email:', e?.message ?? e);
      return null;
    }
  }

  // Mengirim ulang baris notifikasi_email tanpa menambah kolom isi di DB: isi pesan disusun dari subjek & jenis_event.
  async function kirimUlang(baris) {
    const deskripsi = EVENT_LABEL[baris.jenis_event] ?? 'Terdapat pembaruan status pada akun magang Anda.';
    const ok = await eksekusiKirim({
      to: baris.email,
      subject: baris.subjek,
      text: susunIsi({
        nama: baris.nama,
        subjek: baris.subjek,
        pesan: `${baris.subjek}\n\n${deskripsi}\nSilakan masuk ke aplikasi SIGMA UG untuk melihat rincian terbaru.`,
        appUrl,
      }),
    });
    const status = ok ? 'terkirim' : 'gagal';
    const { rows: [updated] } = await db.query(
      'UPDATE notifikasi_email SET status_kirim = $1, dikirim_pada = COALESCE($2, dikirim_pada) WHERE id_notifikasi = $3 RETURNING *',
      [status, ok ? new Date() : null, baris.id_notifikasi],
    );
    return { ...updated, nama: baris.nama, email: baris.email };
  }

  return { kirim, kirimUlang, siap: Boolean(kirimEmail) };
}
