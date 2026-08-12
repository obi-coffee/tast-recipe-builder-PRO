/**
 * Supabase browser client (Phase 4).
 *
 * Reads its config from public env vars. If they aren't set, getSupabase()
 * returns null and the whole app runs in local-only mode — so tāst keeps
 * working before you've connected a Supabase project.
 *
 * Required in .env.local (and in Vercel):
 *   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
 */

import { createClient } from '@supabase/supabase-js';

let client = null;

export function isCloudConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabase() {
  if (client) return client;
  if (typeof window === 'undefined') return null;
  if (!isCloudConfigured()) return null;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
  return client;
}
