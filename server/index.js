import { createClient } from '@supabase/supabase-js';
import { buatApp } from './app.js';
import { dbDariUrl } from './db.js';
import { buatPengirimSmtp } from './email.js';
import { storageSupabase } from './storage.js';
import { verifikatorSupabase } from './auth.js';

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET = 'sigma-berkas', PORT = 3001 } = process.env;
if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Konfigurasi belum lengkap. Salin server/.env.example menjadi server/.env lalu isi DATABASE_URL, SUPABASE_URL, dan SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Kunci service role hanya ada di server; jangan pernah dikirim ke klien.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
// Pembuat akun untuk Manajemen Akun admin (Dosen Pendamping). Akun langsung terkonfirmasi: admin yang menyerahkan kata sandi awal.
// Email dosen belum terkonfirmasi: Supabase mengirim tautan verifikasi ke alamat yang dimasukkan admin, dan dosen baru bisa masuk setelah mengkliknya.
const urlMasuk = `${process.env.APP_URL ?? 'http://localhost:5173'}/masuk`;
const akun = {
  async buat({ email, password, nama }) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: false, user_metadata: { nama } });
    if (error) throw new Error(/already|registered/i.test(error.message) ? 'EMAIL_ADA' : error.message);
    await akun.kirimVerifikasi(email).catch(() => {}); // gagal kirim tidak membatalkan akun: admin bisa mengirim ulang
    return data.user.id;
  },
  async kirimVerifikasi(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: urlMasuk } });
    if (error) throw new Error(error.message);
  },
  async terverifikasi(authId) {
    const { data } = await supabase.auth.admin.getUserById(authId);
    return !!data?.user?.email_confirmed_at;
  },
  hapus: (authId) => supabase.auth.admin.deleteUser(authId),
};
const kirimEmail = buatPengirimSmtp();
if (!kirimEmail) console.warn('SMTP belum dikonfigurasi (SMTP_HOST/USER/PASS kosong); notifikasi email akan dicatat gagal.');
const app = buatApp({ db: dbDariUrl(DATABASE_URL), storage: storageSupabase(supabase, SUPABASE_BUCKET), verifikasi: verifikatorSupabase(supabase), akun, kirimEmail });
app.listen(PORT, () => console.log(`API siap di http://localhost:${PORT}`));
