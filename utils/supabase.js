// utils/supabase.js — shared Supabase client for Express backend
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_KEY env vars. Check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
