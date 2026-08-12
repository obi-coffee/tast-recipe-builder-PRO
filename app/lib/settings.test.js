import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, SETTINGS_DEFAULTS } from './settings';

describe('settings', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaults when nothing is saved', () => {
    expect(loadSettings()).toEqual(SETTINGS_DEFAULTS);
  });

  it('round-trips saved defaults and fills missing keys', () => {
    saveSettings({ grinder: 'Comandante C40', method: 'Pour Over', device: 'V60 02', targetWeight: 250 });
    const s = loadSettings();
    expect(s.grinder).toBe('Comandante C40');
    expect(s.device).toBe('V60 02');
    expect(s.targetWeight).toBe(250);
    expect(s.brewMethod).toBe('balanced'); // default filled in
  });
});
