/**
 * Unified data store (Phase 4).
 *
 * One async API for saved recipes, settings, and the brew log. When a user is
 * signed in (and Supabase is configured) it reads/writes the cloud; otherwise
 * it falls back to localStorage. This lets the app work identically signed-out
 * and locally, and sync across devices once signed in.
 *
 * Every function takes the current `user` (or null). Pass `getSupabase()`'s
 * client implicitly via the helper. All cloud tables are protected by RLS so a
 * user only ever sees their own rows.
 */

import { getSupabase } from './supabase';
import { SETTINGS_DEFAULTS } from './settings';

const RECIPES_KEY = 'tast_recipes';
const SETTINGS_KEY = 'tast_settings';
const BREWLOG_KEY = 'tast_brewlog';

// Collision-proof local id (Date.now() alone repeats within a millisecond).
const localId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── localStorage helpers (SSR-safe) ──────────────────────────────────
function lsGet(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function lsSet(key, val) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('localStorage write failed', e); }
}

// ── row mappers ──────────────────────────────────────────────────────
const rowToRecipe = (row) => ({ id: row.id, savedAt: row.saved_at, ...row.data });
const recipeToRow = (userId, e) => ({ user_id: userId, saved_at: e.savedAt || new Date().toISOString(), data: { recipe: e.recipe, coffeeData: e.coffeeData, brewData: e.brewData } });
const rowToLog = (row) => ({ id: row.id, createdAt: row.created_at, kind: row.kind, rating: row.rating, notes: row.notes, coffeeData: row.coffee, brewData: row.brew, recipe: row.recipe });

// ── Saved recipes ────────────────────────────────────────────────────
export async function getSavedRecipes(user) {
  const sb = user && getSupabase();
  if (sb) {
    const { data, error } = await sb.from('saved_recipes').select('*').order('saved_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToRecipe);
  }
  return lsGet(RECIPES_KEY, []);
}

export async function addSavedRecipe(user, entry) {
  const sb = user && getSupabase();
  if (sb) {
    const { data, error } = await sb.from('saved_recipes').insert(recipeToRow(user.id, entry)).select().single();
    if (error) throw error;
    return rowToRecipe(data);
  }
  const list = lsGet(RECIPES_KEY, []);
  const stored = { ...entry, id: String(entry.id ?? localId()) };
  list.push(stored);
  lsSet(RECIPES_KEY, list);
  return stored;
}

export async function deleteSavedRecipe(user, id) {
  const sb = user && getSupabase();
  if (sb) {
    const { error } = await sb.from('saved_recipes').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  // Compare as strings so a numeric or string id from the caller both match.
  lsSet(RECIPES_KEY, lsGet(RECIPES_KEY, []).filter(r => String(r.id) !== String(id)));
}

// ── Settings ─────────────────────────────────────────────────────────
export async function getSettings(user) {
  const sb = user && getSupabase();
  if (sb) {
    const { data, error } = await sb.from('settings').select('data').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return { ...SETTINGS_DEFAULTS, ...(data?.data || {}) };
  }
  return { ...SETTINGS_DEFAULTS, ...lsGet(SETTINGS_KEY, {}) };
}

export async function putSettings(user, settings) {
  const merged = { ...SETTINGS_DEFAULTS, ...settings };
  const sb = user && getSupabase();
  if (sb) {
    const { error } = await sb.from('settings').upsert({ user_id: user.id, data: merged, updated_at: new Date().toISOString() });
    if (error) throw error;
    return merged;
  }
  lsSet(SETTINGS_KEY, merged);
  return merged;
}

// ── Dial-in tweaks (the learning loop) ───────────────────────────────
// A tweak is the correction the user dialed in for one coffee on one setup:
//   { grindSteps: int (− finer / + coarser), tempDelta: int (°C) }
// Keyed by a coffee+device+grinder signature and stored inside the settings
// row (under `tweaks`), so it rides the same cloud/local path with no extra
// table or migration. The engine reads it back via brewData.tweak next time.
export function tweakSignature(coffeeData = {}, brewData = {}) {
  const coffee = (coffeeData.name || coffeeData.origin || 'coffee').toString().trim();
  return `${coffee}|${brewData.device || ''}|${brewData.grinder || ''}`.toLowerCase();
}

export async function getTweak(user, sig) {
  const s = await getSettings(user);
  return (s.tweaks && s.tweaks[sig]) || null;
}

export async function putTweak(user, sig, tweak) {
  const s = await getSettings(user);
  const tweaks = { ...(s.tweaks || {}) };
  if (tweak && (tweak.grindSteps || tweak.tempDelta)) tweaks[sig] = tweak;
  else delete tweaks[sig]; // clearing a correction (back to neutral)
  await putSettings(user, { ...s, tweaks });
  return tweak;
}

// ── Brew log (rich: brews, tweaks, dial-ins) ─────────────────────────
export async function logBrew(user, entry) {
  const record = {
    kind: entry.kind || 'brew',
    rating: entry.rating ?? null,
    notes: entry.notes || '',
    coffee: entry.coffeeData || {},
    brew: entry.brewData || {},
    recipe: entry.recipe || {},
  };
  const sb = user && getSupabase();
  if (sb) {
    const { data, error } = await sb.from('brew_log').insert({ user_id: user.id, ...record }).select().single();
    if (error) throw error;
    return rowToLog(data);
  }
  const list = lsGet(BREWLOG_KEY, []);
  const stored = { id: localId(), createdAt: new Date().toISOString(), ...entry, kind: record.kind };
  list.unshift(stored);
  lsSet(BREWLOG_KEY, list);
  return stored;
}

export async function getBrewLog(user) {
  const sb = user && getSupabase();
  if (sb) {
    const { data, error } = await sb.from('brew_log').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToLog);
  }
  return lsGet(BREWLOG_KEY, []);
}

export async function deleteBrewLog(user, id) {
  const sb = user && getSupabase();
  if (sb) {
    const { error } = await sb.from('brew_log').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  lsSet(BREWLOG_KEY, lsGet(BREWLOG_KEY, []).filter(r => String(r.id) !== String(id)));
}

// ── Migration: push local data up on first sign-in ───────────────────
// The auth flow can fire this twice on load (getSession + onAuthStateChange).
// We guard with a module-level in-flight promise AND set the "done" flag up
// front, so concurrent/quick re-entries can't create duplicate cloud rows.
let migrating = null;

export async function migrateLocalToCloud(user) {
  if (!user) return;
  const sb = getSupabase();
  if (!sb) return; // local-only mode — nothing to migrate
  const flag = `tast_migrated_${user.id}`;
  if (typeof window !== 'undefined' && window.localStorage.getItem(flag)) return;
  if (migrating) return migrating; // an invocation is already running

  migrating = (async () => {
    // Claim the migration up front so a second caller bails immediately.
    if (typeof window !== 'undefined') window.localStorage.setItem(flag, '1');
    try {
      // Recipes — only seed the cloud if it's empty, to avoid duplicates.
      const localRecipes = lsGet(RECIPES_KEY, []);
      if (localRecipes.length) {
        const { count } = await sb.from('saved_recipes').select('id', { count: 'exact', head: true });
        if (!count) {
          await sb.from('saved_recipes').insert(localRecipes.map(e => recipeToRow(user.id, e)));
        }
      }
      // Settings — seed if none in cloud.
      const localSettings = lsGet(SETTINGS_KEY, null);
      if (localSettings) {
        const { data } = await sb.from('settings').select('user_id').eq('user_id', user.id).maybeSingle();
        if (!data) await putSettings(user, localSettings);
      }
      // Brew log — seed if empty.
      const localLog = lsGet(BREWLOG_KEY, []);
      if (localLog.length) {
        const { count } = await sb.from('brew_log').select('id', { count: 'exact', head: true });
        if (!count) {
          await sb.from('brew_log').insert(localLog.map(e => ({
            user_id: user.id, kind: e.kind || 'brew', rating: e.rating ?? null, notes: e.notes || '',
            coffee: e.coffeeData || {}, brew: e.brewData || {}, recipe: e.recipe || {},
            created_at: e.createdAt || new Date().toISOString(),
          })));
        }
      }
    } catch (e) {
      // On failure, release the claim so it can retry next session.
      if (typeof window !== 'undefined') window.localStorage.removeItem(flag);
      console.error('Cloud migration failed:', e);
    } finally {
      migrating = null;
    }
  })();
  return migrating;
}
