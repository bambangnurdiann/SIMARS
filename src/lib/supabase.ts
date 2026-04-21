import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    // Try both Vite-style and standard process.env (AI Studio uses both depending on state)
    const url = (import.meta as any).env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      const missing = [];
      if (!url) missing.push('VITE_SUPABASE_URL');
      if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY');
      
      throw new Error(`Koneksi Gagal: Variabel ${missing.join(' dan ')} tidak ditemukan. Pastikan sudah diatur di menu Settings (ikon gir) di pojok kiri bawah.`);
    }
    supabaseInstance = createClient(url, anonKey);
  }
  return supabaseInstance;
};

// For backward compatibility with existing imports
export const supabase = {
  get storage() {
    return getSupabase().storage;
  }
} as unknown as SupabaseClient;

export const SUPABASE_BUCKET = (import.meta as any).env.VITE_SUPABASE_BUCKET || 'simars-storage';
