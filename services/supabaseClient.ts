import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** In-memory client so the app can load without .env; real calls are gated in supabaseDatabase. */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'http://127.0.0.1:9',
  isSupabaseConfigured ? supabaseAnonKey : 'local-dev-placeholder',
  isSupabaseConfigured
    ? undefined
    : {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
);
