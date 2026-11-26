/**
 * Supabase Integration Configuration (Stage 2 Ready)
 *
 * In the next development stage, install `@supabase/supabase-js` and provide
 * `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your environment.
 * All repository operations in `src/services/clinicRepository.ts` are structured
 * as async data contracts so the in-memory demonstration adapter can be swapped
 * cleanly for live Supabase queries and Supabase Auth.
 */
export interface SupabaseConnectionConfig {
  url: string | undefined;
  anonKey: string | undefined;
  isConfigured: boolean;
}

export const supabaseConfig: SupabaseConnectionConfig = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  isConfigured: Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  ),
};
