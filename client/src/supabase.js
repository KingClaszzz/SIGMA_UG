import { createClient } from '@supabase/supabase-js';

// Kunci "anon" memang publik; keamanan data ada di server (token diverifikasi) dan RLS di basis data.
const url = import.meta.env.VITE_SUPABASE_URL;
const kunci = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseSiap = Boolean(url && kunci);
export const supabase = supabaseSiap ? createClient(url, kunci) : null;
