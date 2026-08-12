import { describe, it, expect } from 'vitest';
import { buildRecipe } from './index';
import { computeGrind } from './grind';

const coffee = (over = {}) => ({
  name: 'Test Coffee', origin: 'Ethiopia', region: 'Yirgacheffe',
  variety: 'Heirloom', process: 'Washed', roastLevel: 'Medium',
  elevation: '1900', notes: 'floral, citrus, stone fruit', ...over,
});
const brew = (over = {}) => ({ grinder: 'Comandante C40', method: 'Pour Over', device: 'V60 02', targetWeight: 300, ...over });

const firstInt = (s) => {
  const m = String(s).match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

describe('recipe engine — determinism', () => {
  it('returns identical recipes for identical inputs', () => {
    const inputs = [
      { coffeeData: coffee(), brewData: brew() },
      { coffeeData: coffee({ roastLevel: 'Light' }), brewData: brew({ device: 'Chemex 6-Cup' }) },
      { coffeeData: coffee({ process: 'Anaerobic Natural' }), brewData: brew({ grinder: 'Fellows Ode Gen 2', device: 'Kalita Wave 185' }) },
      { coffeeData: coffee(), brewData: brew({ method: 'Espresso', device: 'Home Machine', grinder: 'Niche Zero' }) },
      { coffeeData: coffee(), brewData: brew({ method: 'Cold', device: 'Toddy Cold Brew', grinder: 'Timemore C2' }) },
    ];
    for (const input of inputs) {
      const a = buildRecipe(input);
      const b = buildRecipe(input);
      expect(a).toEqual(b); // deep equality — byte-for-byte stable
    }
  });
});

describe('recipe engine — roast effects (V60)', () => {
  const light = buildRecipe({ coffeeData: coffee({ roastLevel: 'Light' }), brewData: brew() });
  const dark = buildRecipe({ coffeeData: coffee({ roastLevel: 'Dark' }), brewData: brew() });

  it('uses hotter water for lighter roasts', () => {
    expect(Number(light.temperature)).toBeGreaterThan(Number(dark.temperature));
  });
  it('uses less water (lower ratio) for lighter roasts', () => {
    const denom = (r) => Number(r.ratio.split(':')[1]);
    expect(denom(light)).toBeLessThan(denom(dark));
  });
  it('grinds finer (lower click count) for lighter roasts', () => {
    expect(firstInt(light.grindSetting)).toBeLessThan(firstInt(dark.grindSetting));
  });
});

describe('recipe engine — water math', () => {
  it('filter: water equals target and dose = water / ratio (house 1:16.8)', () => {
    // Plain coffee (no variety/elevation) isolates the house pour-over ratio.
    const plain = { origin: 'Brazil', roastLevel: 'Medium', process: 'Washed' };
    const r = buildRecipe({ coffeeData: plain, brewData: brew({ targetWeight: 300 }) });
    expect(r.water).toBe('300g');
    expect(r.ratio).toBe('1:16.8');   // founder house default
    expect(r.dose).toBe('18g');       // round(300/16.8)
  });

  it('espresso: fixed dose and yield = dose × ratio', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ method: 'Espresso', device: 'Home Machine', grinder: 'Niche Zero' }) });
    expect(r.dose).toBe('18g');
    expect(r.ratio).toBe('1:2.0');
    expect(r.water).toBe('36g');      // 18 × 2.0
    expect(r.totalTime).toMatch(/s$/); // shot time in seconds
  });
});

describe('recipe engine — brew-along eligibility', () => {
  const ba = (over) => buildRecipe({ coffeeData: coffee(), brewData: brew(over) }).brewAlong;

  it('offers the live timer for hands-on timed brews', () => {
    expect(ba({})).toBe(true);                                                   // V60 pour-over
    expect(ba({ method: 'Cold', device: 'Flash Brew (Japanese Iced)' })).toBe(true);
    expect(ba({ method: 'Immersion', device: 'French Press' })).toBe(true);
    expect(ba({ method: 'Immersion', device: 'AeroPress' })).toBe(true);
    expect(ba({ method: 'Immersion', device: 'Clever Dripper' })).toBe(true);
  });

  it('hides the timer where there is no manual timed sequence', () => {
    expect(ba({ method: 'Espresso', device: 'Home Machine' })).toBe(false);
    expect(ba({ method: 'Espresso', device: 'Manual Lever' })).toBe(false);
    expect(ba({ method: 'Espresso', device: 'Moka Pot' })).toBe(false);
    expect(ba({ method: 'Cold', device: 'Toddy Cold Brew' })).toBe(false);
    expect(ba({ method: 'Cold', device: 'Mason Jar Cold Brew' })).toBe(false);
  });
});

describe('recipe engine — grind native units', () => {
  it('formats Comandante settings as clicks within its pour-over range', () => {
    const g = computeGrind({ grinderName: 'Comandante C40', grindKey: 'pourOver', t: 0.5 });
    expect(g.grindSetting).toContain('Start:');
    expect(g.grindSetting).toContain('Range:');
    expect(g.start).toMatch(/clicks$/);
    expect(firstInt(g.start)).toBeGreaterThanOrEqual(22);
    expect(firstInt(g.start)).toBeLessThanOrEqual(32);
  });
  it('formats stepless Eureka settings with one decimal', () => {
    const g = computeGrind({ grinderName: 'Eureka Mignon', grindKey: 'pourOver', t: 0.5 });
    expect(g.start).toMatch(/^\d+\.\d$/);
  });
  it('formats Fellows Ode Gen 2 using number + clicks notation', () => {
    const g = computeGrind({ grinderName: 'Fellows Ode Gen 2', grindKey: 'pourOver', t: 0.5 });
    expect(g.start).toMatch(/^\d+( \+ \d click[s]?)?$/);
  });
  it('keeps Baratza Vario within its real macro range (no 11A overflow)', () => {
    const g = computeGrind({ grinderName: 'Baratza Vario+', grindKey: 'coldBrew', t: 1 });
    expect(g.start).toMatch(/^(?:[1-9]|10)[A-Q]$/); // macro 1–10 only
  });
  it('gives the Generic grinder a real fine→coarse spread (not all Medium)', () => {
    const fine = computeGrind({ grinderName: 'Generic', grindKey: 'pourOver', t: 0 });
    const coarse = computeGrind({ grinderName: 'Generic', grindKey: 'coldBrew', t: 1 });
    expect(fine.start).toBe('Medium-Fine');
    expect(coarse.start).toBe('Extra Coarse');
  });
  it('flags a fallback when a filter-only grinder is asked for espresso', () => {
    const g = computeGrind({ grinderName: 'Fellows Ode Gen 1', grindKey: 'espresso', t: 0.5 });
    expect(g.fellBack).toBe(true);
  });

  it('supports the new home grinders with in-range, one-decimal settings', () => {
    const names = ['Mahlkönig X54', 'Mahlkönig X64 SD', 'Mahlkönig E64 WS', 'Weber EG-1', 'Weber Key', 'Weber HG-2'];
    for (const grinderName of names) {
      for (const grindKey of ['espresso', 'pourOver', 'immersion', 'coldBrew']) {
        const g = computeGrind({ grinderName, grindKey, t: 0.5 });
        expect(g.start, `${grinderName}/${grindKey}`).toMatch(/^\d+(\.\d)?$/); // numeric, ≤1 decimal
        expect(g.fellBack, `${grinderName}/${grindKey}`).toBe(false);          // each has a dedicated range
      }
    }
  });
});

describe('recipe engine — shape & edge cases', () => {
  it('always returns the full recipe shape with non-empty steps', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew() });
    for (const k of ['dose', 'water', 'ratio', 'grindSetting', 'totalTime', 'expectedProfile', 'flavorNotes', 'brewSteps', 'dialingIn', 'brewingNotes']) {
      expect(r[k]).toBeDefined();
    }
    expect(r.brewSteps.length).toBeGreaterThan(0);
    for (const s of r.brewSteps) {
      expect(s.step).toBeTruthy();
      expect(s.target).toBeTruthy();
    }
    expect(r.flavorNotes.length).toBeGreaterThan(0);
  });

  it('cold brew is ambient (no temperature) and steeps for hours', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ method: 'Cold', device: 'Toddy Cold Brew', grinder: 'Timemore C2' }) });
    expect(r.temperature).toBe('');
    expect(r.totalTime).toMatch(/hour/);
  });

  it('does not throw on unknown grinder or device', () => {
    expect(() => buildRecipe({ coffeeData: coffee(), brewData: { grinder: 'Mystery Grinder', device: 'Mystery Device', targetWeight: 250 } })).not.toThrow();
  });

  it('pulls flavor notes from roaster notes when present', () => {
    const r = buildRecipe({ coffeeData: coffee({ notes: 'blueberry, dark chocolate' }), brewData: brew() });
    expect(r.flavorNotes).toEqual(['Blueberry', 'Dark chocolate']);
  });
});

describe('recipe engine — cultivar intelligence', () => {
  const base = { origin: 'Ethiopia', roastLevel: 'Light', process: 'Washed', elevation: '' };
  it('brews a delicate Gesha cooler than a Catuai at the same roast', () => {
    const gesha = buildRecipe({ coffeeData: { ...base, variety: 'Gesha' }, brewData: brew() });
    const catuai = buildRecipe({ coffeeData: { ...base, variety: 'Catuai' }, brewData: brew() });
    expect(Number(gesha.temperature)).toBeLessThan(Number(catuai.temperature));
  });
  it('seeds flavor notes from the cultivar when no roaster notes given', () => {
    const r = buildRecipe({ coffeeData: { ...base, variety: 'Gesha', notes: '' }, brewData: brew() });
    expect(r.flavorNotes).toContain('Jasmine');
  });
  it('caps a high-grown light Gesha at its delicate ceiling (≤94°C)', () => {
    const r = buildRecipe({ coffeeData: { origin: 'Panama', variety: 'Gesha', roastLevel: 'Light', process: 'Washed', elevation: '2000' }, brewData: brew() });
    expect(Number(r.temperature)).toBeLessThanOrEqual(94);
  });
  it('holds non-delicate high-grown light coffees at the 97°C filter ceiling', () => {
    const r = buildRecipe({ coffeeData: { origin: 'El Salvador', variety: 'Pacamara', roastLevel: 'Light', process: 'Washed', elevation: '2100' }, brewData: brew() });
    expect(Number(r.temperature)).toBeLessThanOrEqual(97);
  });
});

describe('recipe engine — elevation/density', () => {
  const firstNum = (s) => parseFloat(String(s).match(/\d+(\.\d+)?/)[0]);
  it('grinds a very high-grown coffee finer than a low-grown one', () => {
    const high = buildRecipe({ coffeeData: { origin: 'Colombia', roastLevel: 'Medium', variety: '', elevation: '2100 masl' }, brewData: brew() });
    const low = buildRecipe({ coffeeData: { origin: 'Brazil', roastLevel: 'Medium', variety: '', elevation: '1000 masl' }, brewData: brew() });
    expect(firstNum(high.grindSetting)).toBeLessThan(firstNum(low.grindSetting));
  });
});

describe('recipe engine — signature methods', () => {
  it('Kasuya 4:6 shifts the ratio to 1:15 and uses five pours', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ brewMethod: 'kasuya46' }) });
    expect(r.ratio).toBe('1:15');
    expect(r.method).toBe('kasuya46');
    expect(r.brewSteps.filter(s => /Pour/i.test(s.step)).length).toBe(5);
  });
  it('falls back to Balanced when a method does not apply to the device', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ method: 'Espresso', device: 'Home Machine', grinder: 'Niche Zero', brewMethod: 'kasuya46' }) });
    expect(r.method).toBe('balanced');
  });
});

describe('recipe engine — Tier B correctness', () => {
  const clicks = (r) => firstInt(r.grindSetting);

  it('brews decaf coarser, cooler, and slightly longer than the same regular coffee', () => {
    const base = { name: 'Colombia', origin: 'Colombia', roastLevel: 'Medium', process: 'Washed', variety: '', elevation: '' };
    const reg = buildRecipe({ coffeeData: base, brewData: brew() });
    const dec = buildRecipe({ coffeeData: { ...base, name: 'Colombia Decaf', process: 'Washed Decaf' }, brewData: brew() });
    expect(clicks(dec)).toBeGreaterThan(clicks(reg));                     // coarser
    expect(Number(dec.temperature)).toBeLessThan(Number(reg.temperature)); // cooler
    const denom = (r) => Number(r.ratio.split(':')[1]);
    expect(denom(dec)).toBeGreaterThan(denom(reg));                       // slightly longer
    expect(dec.brewingNotes.some(n => /decaf/i.test(n))).toBe(true);
  });

  it('detects decaf from the coffee name even when process says washed', () => {
    const dec = buildRecipe({ coffeeData: coffee({ name: 'Swiss Water Decaf', process: 'Washed' }), brewData: brew() });
    expect(dec.brewingNotes.some(n => /porous|decaf/i.test(n))).toBe(true);
  });

  it('stretches espresso ratio for light roast and tightens it for dark', () => {
    const light = buildRecipe({ coffeeData: coffee({ roastLevel: 'Light' }), brewData: brew({ device: 'Home Machine', grinder: 'Niche Zero' }) });
    const dark = buildRecipe({ coffeeData: coffee({ roastLevel: 'Dark' }), brewData: brew({ device: 'Home Machine', grinder: 'Niche Zero' }) });
    const denom = (r) => Number(r.ratio.split(':')[1]);
    expect(denom(light)).toBeGreaterThan(denom(dark));
    expect(denom(light)).toBeGreaterThan(2.1); // meaningfully longer than the old near-flat 2.1
    expect(light.brewingNotes.some(n => /Light-roast espresso/.test(n))).toBe(true);
  });

  it('gives honey and wet-hulled their own process handling', () => {
    const honey = buildRecipe({ coffeeData: coffee({ process: 'Yellow Honey' }), brewData: brew() });
    const wet = buildRecipe({ coffeeData: coffee({ process: 'Wet-Hulled' }), brewData: brew() });
    expect(honey.brewingNotes.some(n => /honey/i.test(n))).toBe(true);
    expect(wet.brewingNotes.some(n => /giling|wet-hulled|earthy/i.test(n))).toBe(true);
  });

  it('tunes to water hardness: soft runs hotter than hard', () => {
    const soft = buildRecipe({ coffeeData: coffee(), brewData: brew({ water: 'soft' }) });
    const hard = buildRecipe({ coffeeData: coffee(), brewData: brew({ water: 'hard' }) });
    expect(Number(soft.temperature)).toBeGreaterThan(Number(hard.temperature));
    expect(hard.brewingNotes.some(n => /hard water/i.test(n))).toBe(true);
  });

  it('flags inputs outside the knowledge well (coverage advisor), capped at two', () => {
    const r = buildRecipe({ coffeeData: { variety: 'Frankenvariety 9000', roastLevel: '' }, brewData: { device: 'Teapot 3000', grinder: 'Mystery Mill', targetWeight: 300 } });
    const flags = r.brewingNotes.filter(n => /don’t have|isn’t in our|roast level/i.test(n));
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.length).toBeLessThanOrEqual(2);
  });

  it('says nothing out-of-well when everything is known', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew() });
    expect(r.brewingNotes.some(n => /isn’t in our|don’t have grind data/i.test(n))).toBe(false);
  });
});

describe('recipe engine — Tier A upgrades', () => {
  it('speaks dial-in advice in the grinder’s own units', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ grinder: 'Comandante C40' }) });
    expect(r.grindHint.finer).toMatch(/clicks finer/);
    const sour = r.dialingIn.find(d => /sour/i.test(d.issue));
    expect(sour.fix).toMatch(/clicks finer/);
  });
  it('gives a stepless grinder a decimal-unit hint', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ device: 'Orea V4', grinder: 'Weber EG-1' }) });
    expect(r.grindHint.finer).toMatch(/marks finer|on the dial finer/);
  });
  it('always includes a water-quality note', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew() });
    expect(r.brewingNotes.some(n => /Water is most of the cup/.test(n))).toBe(true);
  });
  it('pours a delicate cultivar gently', () => {
    const gesha = buildRecipe({ coffeeData: coffee({ variety: 'Gesha' }), brewData: brew() });
    const bloom = gesha.brewSteps.find(s => /Bloom/i.test(s.step));
    expect(bloom.technique).toMatch(/gentle/i);
    const bourbon = buildRecipe({ coffeeData: coffee({ variety: 'Bourbon' }), brewData: brew() });
    expect(bourbon.brewSteps.find(s => /Bloom/i.test(s.step)).technique).not.toMatch(/gentle/i);
  });
  it('applies a learning-loop tweak: "too sour" grinds finer next time', () => {
    const before = buildRecipe({ coffeeData: coffee(), brewData: brew({ grinder: 'Comandante C40' }) });
    const after = buildRecipe({ coffeeData: coffee(), brewData: brew({ grinder: 'Comandante C40', tweak: { grindSteps: -1, tempDelta: 1 } }) });
    const clicks = (r) => firstInt(r.grindSetting);
    expect(clicks(after)).toBeLessThan(clicks(before));      // finer = fewer clicks
    expect(Number(after.temperature)).toBe(Number(before.temperature) + 1);
    expect(after.adjusted).toBe(true);
    expect(before.adjusted).toBe(false);
  });
});

describe('recipe engine — maker recipes lead (Orea temps hold their intent)', () => {
  const at = (roastLevel, id) => Number(buildRecipe({
    coffeeData: coffee({ roastLevel, process: 'Washed' }),
    brewData: brew({ device: 'Orea V4', brewMethod: id, targetWeight: 300 }),
  }).temperature);

  it('keeps a recipe close to its own target temperature across roasts', () => {
    // The Dara is a ~92°C recipe — the coffee only nudges it a few degrees,
    // so it never swings all the way to the ceiling on a light roast.
    expect(Math.abs(at('Light', 'orea_v4_dara') - at('Dark', 'orea_v4_dara'))).toBeLessThanOrEqual(5);
  });
  it('preserves the maker temperature ordering even at a light roast', () => {
    expect(at('Light', 'orea_v4_fine')).toBeLessThan(at('Light', 'orea_v4_aussie'));
    expect(at('Light', 'orea_v4_dara')).toBeLessThan(at('Light', 'orea_v4_og_base'));
  });
  it('lets the method shift the grind on a stepped grinder', () => {
    const g = (id) => firstInt(buildRecipe({
      coffeeData: coffee({ roastLevel: 'Medium' }),
      brewData: brew({ device: 'Orea V4', grinder: 'Weber EG-1', brewMethod: id, targetWeight: 300 }),
    }).grindSetting);
    expect(g('orea_v4_fine')).toBeLessThan(g('orea_v4_aussie')); // fine recipe grinds finer
  });
});

describe('recipe engine — roast freshness', () => {
  const NOW = Date.parse('2026-06-22');
  it('gives just-roasted coffee a bigger bloom than rested coffee', () => {
    const bloomG = (r) => parseInt(r.brewSteps.find(s => /Bloom/i.test(s.step)).target);
    const fresh = buildRecipe({ coffeeData: coffee({ roastedOn: '2026-06-21' }), brewData: brew(), now: NOW });
    const rested = buildRecipe({ coffeeData: coffee({ roastedOn: '2026-06-01' }), brewData: brew(), now: NOW });
    expect(bloomG(fresh)).toBeGreaterThan(bloomG(rested));
  });
  it('is deterministic when now is injected', () => {
    const input = { coffeeData: coffee({ roastedOn: '2026-06-10' }), brewData: brew(), now: NOW };
    expect(buildRecipe(input)).toEqual(buildRecipe(input));
  });
});

describe('recipe engine — Orea line', () => {
  it('builds a valid recipe for every Orea model', () => {
    for (const device of ['Orea O1', 'Orea V3', 'Orea V4', 'Orea Z1', 'Orea Big Boy']) {
      const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ device }) });
      expect(r.brewSteps.length).toBeGreaterThan(0);
      expect(r.ratio).toMatch(/^1:/);
    }
  });
});

describe('recipe engine — Orea named recipes', () => {
  it('reproduces Orea V4 “The Champ” pour plan and exact ratio', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ device: 'Orea V4', brewMethod: 'orea_v4_champ', targetWeight: 270 }) });
    expect(r.method).toBe('orea_v4_champ');
    expect(r.ratio).toBe('1:15.9');             // maker ratio, not roast-shifted
    expect(r.temperature).toBe('93');
    expect(r.brewSteps.some(s => s.target.startsWith('120g'))).toBe(true);
    expect(r.brewSteps.some(s => s.target.startsWith('170g'))).toBe(true);
  });
  it('an Orea recipe does not apply to a non-Orea brewer (falls back)', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ device: 'V60 02', brewMethod: 'orea_v4_champ' }) });
    expect(r.method).toBe('balanced');
  });
  it('scales an Orea recipe to a different brew weight', () => {
    const r = buildRecipe({ coffeeData: coffee(), brewData: brew({ device: 'Orea V4', brewMethod: 'orea_v4_easy', targetWeight: 520 }) });
    expect(r.water).toBe('520g');               // doubled from the 260 reference
    expect(r.brewSteps[r.brewSteps.length - 1].target).toBe('520g');
  });
});
