import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSavedRecipes, addSavedRecipe, deleteSavedRecipe,
  getSettings, putSettings, getBrewLog, logBrew, deleteBrewLog, migrateLocalToCloud,
  tweakSignature, getTweak, putTweak,
} from './store';

// With no Supabase env configured and user = null, the store uses localStorage.
describe('store — local fallback (signed out)', () => {
  beforeEach(() => localStorage.clear());

  it('saves, lists, and deletes recipes locally', async () => {
    const entry = { id: 1, recipe: { dose: '18g' }, coffeeData: { name: 'A' }, brewData: { device: 'V60 02' }, savedAt: 't' };
    await addSavedRecipe(null, entry);
    let list = await getSavedRecipes(null);
    expect(list).toHaveLength(1);
    expect(list[0].coffeeData.name).toBe('A');
    await deleteSavedRecipe(null, 1);
    list = await getSavedRecipes(null);
    expect(list).toHaveLength(0);
  });

  it('round-trips settings with defaults filled in', async () => {
    await putSettings(null, { grinder: 'Comandante C40', device: 'V60 02' });
    const s = await getSettings(null);
    expect(s.grinder).toBe('Comandante C40');
    expect(s.brewMethod).toBe('balanced'); // default
  });

  it('logs brews newest-first', async () => {
    await logBrew(null, { kind: 'brew', rating: 5, notes: 'great', coffeeData: { name: 'A' }, brewData: {}, recipe: {} });
    await logBrew(null, { kind: 'dial-in', notes: 'too sour', coffeeData: { name: 'A' }, brewData: {}, recipe: {} });
    const log = await getBrewLog(null);
    expect(log).toHaveLength(2);
    expect(log[0].kind).toBe('dial-in'); // most recent first
    expect(log[1].rating).toBe(5);
  });

  it('deletes a brew from the log', async () => {
    const a = await logBrew(null, { kind: 'brew', coffeeData: { name: 'A' }, brewData: {}, recipe: {} });
    const b = await logBrew(null, { kind: 'brew', coffeeData: { name: 'B' }, brewData: {}, recipe: {} });
    await deleteBrewLog(null, a.id);
    const log = await getBrewLog(null);
    expect(log).toHaveLength(1);
    expect(log[0].id).toBe(b.id);
  });

  it('migrateLocalToCloud is a no-op when signed out', async () => {
    await expect(migrateLocalToCloud(null)).resolves.toBeUndefined();
  });

  it('persists and clears a per-coffee dial-in tweak (learning loop)', async () => {
    const coffeeData = { name: 'Kenya AA' };
    const brewData = { device: 'V60 02', grinder: 'Comandante C40' };
    const sig = tweakSignature(coffeeData, brewData);
    expect(await getTweak(null, sig)).toBeNull();

    await putTweak(null, sig, { grindSteps: -1, tempDelta: 1 });
    expect(await getTweak(null, sig)).toEqual({ grindSteps: -1, tempDelta: 1 });

    // A different coffee keeps its own correction, independently.
    const sig2 = tweakSignature({ name: 'Brazil' }, brewData);
    expect(await getTweak(null, sig2)).toBeNull();

    // Clearing back to neutral removes it.
    await putTweak(null, sig, { grindSteps: 0, tempDelta: 0 });
    expect(await getTweak(null, sig)).toBeNull();
  });
});
