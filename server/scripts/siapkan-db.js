// Menyiapkan Supabase sekali (aman diulang): membuat tabel dari db/schema.sql dan bucket penyimpanan privat.
// Pemakaian: npm run db:siapkan   (butuh server/.env terisi)
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { dbDariUrl } from '../db.js';

const { DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET = 'sigma-berkas' } = process.env;
if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Isi dulu server/.env (lihat server/.env.example).');
  process.exit(1);
}

const db = dbDariUrl(DATABASE_URL);
await db.query(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
console.log('Tabel siap.');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { error } = await supabase.storage.createBucket(SUPABASE_BUCKET, { public: false, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ['application/pdf'] });
if (error && !/already exists/i.test(error.message)) throw error;
console.log(`Bucket "${SUPABASE_BUCKET}" siap.`);
process.exit(0);
