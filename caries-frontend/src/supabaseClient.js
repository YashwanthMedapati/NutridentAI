import { createClient } from "@supabase/supabase-js";

const env = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || env.REACT_APP_SUPABASE_URL;
const supabaseKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
  env.REACT_APP_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
