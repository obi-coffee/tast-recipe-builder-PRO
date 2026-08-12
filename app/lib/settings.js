/**
 * User settings (Phase 3).
 *
 * Stores the user's default gear so the wizard pre-fills. Kept behind this
 * small module so Phase 4 can swap localStorage for the cloud without touching
 * the UI. SSR-safe (no-ops when window is undefined).
 */

const SETTINGS_KEY = 'tast_settings';

export const SETTINGS_DEFAULTS = {
  grinder: '',
  method: '',        // brew category, e.g. 'Pour Over'
  device: '',
  targetWeight: 300,
  brewMethod: 'balanced',
  useFahrenheit: true, // temperature display unit (true = °F, false = °C)
  water: 'unknown',    // water hardness profile: 'soft' | 'balanced' | 'hard' | 'unknown'
  theme: 'system',     // appearance: 'system' | 'light' | 'dark' (wine)
};

export function loadSettings() {
  if (typeof window === 'undefined') return { ...SETTINGS_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) } : { ...SETTINGS_DEFAULTS };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

export function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...SETTINGS_DEFAULTS, ...settings }));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
