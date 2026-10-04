import { describe, it, expect } from 'vitest';
import { recommendMethod, methodsForDevice, METHODS, AUTO_METHOD } from './methods';
import { getDevice } from './devices';
import { getProcessAdjustment } from './profiles';
import { buildRecipe } from '../../lib/recipe-engine';
import { PROCESSES, PROCESS_GROUPS, normalizeProcess } from '../brewing-options';

const pick = (process, roastLevel, deviceName) =>
  recommendMethod({ family: getProcessAdjustment(process).family, roastLevel, device: getDevice(deviceName), deviceName });

describe('Best for the bean — recommendMethod', () => {
  it('is deterministic', () => {
    const a = pick('Washed', 'Light', 'V60 02');
    const b = pick('Washed', 'Light', 'V60 02');
    expect(a).toEqual(b);
  });

  it('only ever picks a method the brewer actually supports', () => {
    for (const deviceName of ['V60 02', 'Kalita Wave 185', 'Orea V4', 'Orea Big Boy', 'AeroPress', 'French Press', 'Home Machine', 'Toddy Cold Brew']) {
      const allowed = new Set(methodsForDevice(getDevice(deviceName), deviceName).map(m => m.id));
      for (const process of PROCESSES) {
        for (const roast of ['Light', 'Medium', 'Dark']) {
          const p = pick(process, roast, deviceName);
          expect(allowed.has(p.id), `${process}/${roast}/${deviceName} → ${p.id}`).toBe(true);
          expect(p.reason).toMatch(/Best for the bean chose/);
        }
      }
    }
  });

  it('sends a clean light washed coffee to Hoffmann on a V60', () => {
    expect(pick('Washed', 'Light', 'V60 02').id).toBe('hoffmann');
  });
  it('sends a fermented coffee to Kasuya 4:6 on a V60', () => {
    expect(pick('Anaerobic Natural', 'Light', 'V60 02').id).toBe('kasuya46');
  });
  it('sends a dark roast to Kasuya 4:6 on a V60', () => {
    expect(pick('Washed', 'Dark', 'V60 02').id).toBe('kasuya46');
  });
  it('prefers the maker recipe on an Orea when it fits (The Aussie tames ferment)', () => {
    expect(pick('Carbonic Maceration Natural', 'Medium', 'Orea V4').id).toBe('orea_v4_aussie');
  });
  it('uses the Big Boy base recipe for a batch brew', () => {
    expect(pick('Washed', 'Medium', 'Orea Big Boy').id).toBe('orea_bigboy_base');
  });
  it('falls back to Balanced when nothing specialist applies', () => {
    expect(pick('Honey', 'Medium', 'French Press').id).toBe('balanced');
    expect(pick('Washed', 'Medium', 'Home Machine').id).toBe('balanced');
  });
  it('every method with a fit has a why', () => {
    for (const m of Object.values(METHODS)) if (m.fit) expect(m.fit.why.length).toBeGreaterThan(20);
  });
});

describe('Best for the bean — engine integration', () => {
  const coffee = { name: 'Test', origin: 'Colombia', variety: 'Caturra', process: 'Anaerobic Natural', roastLevel: 'Light' };
  const brew = { grinder: 'Comandante C40', method: 'Pour Over', device: 'V60 02', targetWeight: 300 };

  it('resolves AUTO to a real method and explains it', () => {
    const r = buildRecipe({ coffeeData: coffee, brewData: { ...brew, brewMethod: AUTO_METHOD } });
    expect(r.methodRequested).toBe('auto');
    expect(r.method).toBe('kasuya46');
    expect(r.methodLabel).toBe('Kasuya 4:6');
    expect(r.methodReason).toContain('Kasuya 4:6');
  });
  it('produces the same recipe as choosing that method by hand', () => {
    const auto = buildRecipe({ coffeeData: coffee, brewData: { ...brew, brewMethod: AUTO_METHOD } });
    const manual = buildRecipe({ coffeeData: coffee, brewData: { ...brew, brewMethod: 'kasuya46' } });
    const strip = ({ methodRequested, methodReason, ...rest }) => rest;
    expect(strip(auto)).toEqual(strip(manual));
    expect(manual.methodReason).toBe('');
  });
});

describe('Process groups', () => {
  it('has no duplicate entries and every entry belongs to exactly one group', () => {
    expect(new Set(PROCESSES).size).toBe(PROCESSES.length);
    expect(PROCESS_GROUPS.flatMap(g => g.options)).toEqual(PROCESSES);
  });
  it('classifies the new experimental entries into the right engine family', () => {
    const fam = (p) => getProcessAdjustment(p).family;
    expect(fam('Cold-Ferment Washed')).toBe('washed-ferment');
    expect(fam('Dry-Ferment Washed')).toBe('washed-ferment');
    expect(fam('Hybrid Washed')).toBe('washed-ferment');
    expect(fam('Thermal Shock Washed')).toBe('anaerobic');
    expect(fam('Thermal Shock Natural')).toBe('anaerobic');
    expect(fam('Co-Fermented Washed')).toBe('anaerobic');
    expect(fam('Cold-Ferment Natural')).toBe('natural');
    expect(fam('Shade-Dried Natural')).toBe('natural');
    expect(fam('Koji Natural')).toBe('anaerobic');
    expect(fam('Nitrogen Macerated')).toBe('anaerobic');
    expect(fam('Mosto Honey')).toBe('anaerobic');
    expect(fam('Hydro Honey')).toBe('honey');
    expect(fam('Cold-Ferment Honey')).toBe('honey');
    expect(fam('Submerged Fermentation')).toBe('anaerobic');
    expect(fam('Symbiotic Process')).toBe('anaerobic');
    expect(fam('Washed')).toBe('washed');
  });
  it('normalizes roaster labels and legacy values onto list entries', () => {
    expect(normalizeProcess('Thermal Shock')).toBe('Thermal Shock Washed');
    expect(normalizeProcess('Yeast-Inoculated / Co-Fermented')).toBe('Yeast-Inoculated');
    expect(normalizeProcess('Cold Ferment Natural')).toBe('Cold-Ferment Natural');
    expect(normalizeProcess('Natural – Dark Room')).toBe('Natural');
    expect(normalizeProcess('Honey Mosto Ferment - Dark Room')).toBe('Mosto Honey');
    expect(normalizeProcess('Washed Thermal Shock')).toBe('Thermal Shock Washed');
    expect(normalizeProcess('Honey')).toBe('Honey');
    expect(normalizeProcess('Black Honey')).toBe('Honey - Black');
    expect(normalizeProcess('EA Sugarcane')).toBe('');
    expect(normalizeProcess('')).toBe('');
  });
});
