import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL dan Anon Key belum diatur di Settings.');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
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
