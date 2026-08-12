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
let warned = false;

// Env values arrive from dashboards where stray quotes and whitespace are easy
// to paste in — normalize before judging or using them.
function cleanEnv(v) {
  return String(v || '').trim().replace(/^["']|["']$/g, '');
}

function validUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isCloudConfigured() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return Boolean(url && key && validUrl(url));
}

export function getSupabase() {
  if (client) return client;
  if (typeof window === 'undefined') return null;
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  // A malformed URL (typo, swapped values, half-pasted key) must NEVER crash
  // the app — degrade to local-only mode and say why in the console.
  if (!validUrl(url)) {
    if (!warned) {
      warned = true;
      console.error(`tāst: NEXT_PUBLIC_SUPABASE_URL doesn't look like a URL (got "${url.slice(0, 40)}…"). Running in local-only mode — check your environment variables.`);
    }
    return null;
  }
  try {
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch (e) {
    if (!warned) {
      warned = true;
      console.error('tāst: Supabase client failed to initialize — running in local-only mode.', e);
    }
    client = null;
    return null;
  }
  return client;
}
