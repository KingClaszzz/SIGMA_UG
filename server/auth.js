// Verifikasi token Supabase Auth. Peran TIDAK dibaca dari token: peran ada di tabel users (diisi server/admin),
// supaya pengguna tidak bisa menaikkan hak aksesnya lewat metadata akun.
export function verifikatorSupabase(supabase) {
  return async (token) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.email) return null;
    const u = data.user;
    const nama = (u.user_metadata?.nama ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email.split('@')[0]).trim() || u.email.split('@')[0];
    return { auth_id: u.id, email: u.email.trim().toLowerCase(), nama };
  };
}
