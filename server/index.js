import { createClient } from '@supabase/supabase-js';
import { buatApp } from './app.js';
import { dbDariUrl } from './db.js';
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
const akun = {
  async buat({ email, password, nama }) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nama } });
    if (error) throw new Error(/already|registered/i.test(error.message) ? 'EMAIL_ADA' : error.message);
    return data.user.id;
  },
  hapus: (authId) => supabase.auth.admin.deleteUser(authId),
};
const app = buatApp({ db: dbDariUrl(DATABASE_URL), storage: storageSupabase(supabase, SUPABASE_BUCKET), verifikasi: verifikatorSupabase(supabase), akun });
app.listen(PORT, () => console.log(`API siap di http://localhost:${PORT}`));
