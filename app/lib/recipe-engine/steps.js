/**
 * Brew-step builder. Produces the staged brew guide for a recipe, scaled to
 * the computed dose / water, with targets like "120g · 1:15".
 *
 * Each step is { step, target, technique, why } — the exact shape the recipe
 * UI renders.
 */

function fmtTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Largest m:ss in a label → seconds. ("3:00–3:30" → 210)
function upperTimeSec(label) {
  const all = [...String(label || '').matchAll(/(\d+):([0-5]\d)/g)];
  if (!all.length) return null;
  const last = all[all.length - 1];
  return parseInt(last[1], 10) * 60 + parseInt(last[2], 10);
}

// Pour-over family: bloom + N staged pours + drawdown.
function filterSteps({ doseG, waterForPours, bloomG, bloomSeconds, totalTimeLabel, pours, leadIn = [], agitation }) {
  const steps = [...leadIn];
  const gentle = agitation === 'gentle';
  const circles = gentle ? 'slow, gentle circles' : 'slow circles';
  // Prep happens BEFORE the timer — rinse the paper, warm the brewer, dose.
  steps.push({
    step: 'Rinse & dose',
    target: 'Prep',
    technique: `Rinse the paper filter with hot water to wash out any papery taste and warm the brewer, then tip that water away. Add ${doseG}g of coffee and shake it level.`,
    why: 'A rinsed filter and warm brewer keep the cup clean and on-temperature. Nothing is timed yet — the clock starts with your bloom.',
  });
  // The bloom is the first TIMED pour onto the grounds.
  steps.push({
    step: 'Bloom',
    target: `${bloomG}g · 0:00`,
    technique: `Start your timer and pour ${bloomG}g over the grounds in ${circles} until they’re all wet, then swirl gently and wait.`,
    why: 'Fresh coffee gives off CO₂; this “bloom” lets the gas escape so the rest of the pour extracts evenly.',
  });

  const remaining = Math.max(0, waterForPours - bloomG);
  const n = Math.max(1, pours);
  const perPour = remaining / n;
  // Space the pours across the actual brew window (after the bloom, leaving room
  // for drawdown) so a slow brewer like a Chemex doesn't finish its pours far
  // ahead of its stated total time. Falls back to 35s when no total is given.
  let interval = 35;
  const totalSec = upperTimeSec(totalTimeLabel);
  if (totalSec) {
    const drawdown = Math.max(30, Math.round(totalSec * 0.2));
    const window = totalSec - drawdown - bloomSeconds;
    if (window > 0) interval = Math.max(20, Math.min(50, Math.round(window / n)));
  }
  let cum = bloomG;
  for (let i = 1; i <= n; i++) {
    cum = i === n ? waterForPours : Math.round(bloomG + perPour * i);
    // The first main pour begins right as the bloom ends (not bloom + interval),
    // so the bloom phase reads as its real length (e.g. 0:45, not 1:20).
    const t = bloomSeconds + interval * (i - 1);
    steps.push({
      step: n === 1 ? 'Main Pour' : `Pour ${i}`,
      target: `${cum}g · ${fmtTime(t)}`,
      technique: i === 1
        ? `After the bloom, pour in ${gentle ? 'slow, gentle concentric circles' : 'slow concentric circles'} up to ${cum}g.`
        : `Top up to ${cum}g in ${circles}, keeping water off the filter walls.`,
      why: i === 1
        ? (gentle ? 'A gentle pour protects this delicate, aromatic coffee while building extraction for clarity.' : 'Builds the extraction gradually for clarity.')
        : undefined,
    });
  }

  steps.push({
    step: 'Drawdown',
    target: `${waterForPours}g`,
    technique: `Let the bed draw down fully — aim to finish around ${totalTimeLabel}.`,
    why: undefined,
  });
  return steps;
}

function frenchPressSteps({ doseG, waterG }) {
  return [
    { step: 'Add & Steep', target: `${waterG}g · 0:00`, technique: `Add ${doseG}g coffee and all ${waterG}g water. Don't stir.`, why: 'Full immersion begins evenly.' },
    { step: 'Break the Crust', target: '4:00', technique: 'Break the crust with a spoon, stir gently, then skim the foam and floating grounds.', why: 'Drops the grounds and clears fines for a cleaner cup.' },
    { step: 'Settle', target: '~8:00', technique: 'Let it rest until the grounds settle to the bottom.', why: undefined },
    { step: 'Press & Pour', target: `${waterG}g`, technique: 'Press the plunger just to the surface — not all the way down — and pour gently.', why: undefined },
  ];
}

function aeropressSteps({ doseG, waterG }) {
  return [
    { step: 'Add & Stir', target: `${waterG}g · 0:00`, technique: `Add ${doseG}g coffee, pour ${waterG}g water, and stir 3–5 times.`, why: 'Even saturation for a balanced extraction.' },
    { step: 'Steep', target: '1:00–1:30', technique: 'Cap with a damp paper filter and let it steep.', why: undefined },
    { step: 'Press', target: `${waterG}g`, technique: 'Press slowly over ~30 seconds and stop at the hiss.', why: undefined },
  ];
}

function steepDrainSteps({ doseG, waterG }) {
  return [
    { step: 'Add & Steep', target: `${waterG}g · 0:00`, technique: `Add ${doseG}g coffee and all ${waterG}g water. Stir once to wet the grounds.`, why: 'Forgiving full immersion.' },
    { step: 'Drain', target: `${waterG}g`, technique: 'Set it on your mug (or open the valve) and let it drain fully.', why: undefined },
  ];
}

function espressoSteps({ doseG, yieldG, ratioLabel, totalTimeLabel }) {
  return [
    { step: 'Prep', target: `${doseG}g in`, technique: `Dose ${doseG}g, distribute, and tamp level. A quick WDT stir reduces channeling.`, why: 'Even puck = even extraction.' },
    { step: 'Extract', target: `${yieldG}g · ${totalTimeLabel}`, technique: `Pull to ${yieldG}g out (1:${ratioLabel}) in ${totalTimeLabel}.`, why: 'Target ratio and time for a balanced shot.' },
  ];
}

function mokaSteps({ doseG, waterG, totalTimeLabel }) {
  return [
    { step: 'Fill', target: `${waterG}g · 0:00`, technique: `Fill the base with hot water to just below the valve, and fill the basket with ${doseG}g — level, don't tamp.`, why: 'Hot start shortens time on the heat.' },
    { step: 'Heat', target: totalTimeLabel, technique: 'Assemble and place on low-medium heat until coffee flows honey-colored and steady.', why: undefined },
    { step: 'Stop', target: 'done', technique: 'Pull it off the heat the moment it blondes and sputters; cool the base under the tap.', why: 'Stops extraction before it scorches.' },
  ];
}

function coldSteepSteps({ doseG, waterG, totalTimeLabel }) {
  return [
    { step: 'Combine', target: `${waterG}g · 0:00`, technique: `Combine ${doseG}g extra-coarse coffee with ${waterG}g cold water; make sure every ground is wet.`, why: 'Slow, cold extraction needs full contact.' },
    { step: 'Steep', target: totalTimeLabel, technique: 'Steep in the fridge or at room temperature.', why: undefined },
    { step: 'Strain', target: `${waterG}g`, technique: 'Strain through the brewer’s filter — add a paper filter for extra clarity.', why: undefined },
  ];
}

/**
 * Build steps for a recipe. `ctx` carries everything the templates need.
 */
export function buildSteps(ctx) {
  const { style } = ctx;
  switch (style) {
    case 'frenchpress': return frenchPressSteps(ctx);
    case 'aeropress':   return aeropressSteps(ctx);
    case 'steepdrain':  return steepDrainSteps(ctx);
    case 'espresso':    return espressoSteps(ctx);
    case 'moka':        return mokaSteps(ctx);
    case 'coldsteep':   return coldSteepSteps(ctx);
    case 'flash': {
      const leadIn = [{
        step: 'Ice the Carafe',
        target: `${ctx.iceG}g ice`,
        technique: `Add ${ctx.iceG}g ice to the server. You'll brew the hot water directly onto it.`,
        why: 'Flash-chilling locks in aromatics and acidity.',
      }];
      return filterSteps({ ...ctx, waterForPours: ctx.hotG, leadIn });
    }
    case 'kasuya':      return kasuyaSteps(ctx);
    case 'rao':         return raoSteps(ctx);
    case 'champ':       return champSteps(ctx);
    case 'orea':        return oreaSteps(ctx);
    case 'filter':
    default:            return filterSteps({ ...ctx, waterForPours: ctx.waterG });
  }
}

// Kasuya 4:6 — five pours. First two pours = 40% (sweetness/acidity), last
// three = 60% (strength). Balanced split (sweeter side).
function kasuyaSteps({ doseG, waterG }) {
  const W = waterG;
  const targets = [0.2, 0.4, 0.6, 0.8, 1.0].map((f, i) => i === 4 ? W : Math.round(W * f));
  const times = ['0:00', '0:45', '1:30', '2:10', '2:30'];
  const steps = [];
  steps.push({
    step: 'Rinse & dose',
    target: 'Prep',
    technique: `Rinse the paper filter with hot water and warm the brewer, then tip that water away. Add ${doseG}g of coffee and shake it level.`,
    why: 'Prep first — the clock starts with your first pour.',
  });
  steps.push({
    step: 'Pour 1 (bloom)', target: `${targets[0]}g · ${times[0]}`,
    technique: `Start your timer and pour to ${targets[0]}g in slow circles — this first pour also blooms the bed.`,
    why: 'In the 4:6 method the first 40% of water (pours 1–2) sets the sweetness-to-acidity balance.',
  });
  for (let i = 1; i < 5; i++) {
    steps.push({
      step: `Pour ${i + 1}`, target: `${targets[i]}g · ${times[i]}`,
      technique: `When the bed nearly drains, pour to ${targets[i]}g.`,
      why: i === 1 ? 'Completes the 40% balance pours.' : (i === 2 ? 'The last 60% (pours 3–5) builds strength.' : undefined),
    });
  }
  steps.push({ step: 'Drawdown', target: `${W}g`, technique: 'Let it finish draining — around 3:30. Sweeter? Make pour 1 smaller. Brighter? Make it bigger.', why: undefined });
  return steps;
}

// Scott Rao — big bloom + stir, one steady pour, then a swirl to flatten the bed.
function raoSteps({ doseG, waterG, bloomG }) {
  return [
    { step: 'Rinse & dose', target: 'Prep', technique: `Rinse the paper filter with hot water and warm the brewer, then tip that water away. Add ${doseG}g of coffee and shake it level.`, why: 'Prep first — the clock starts with your bloom.' },
    { step: 'Bloom + Stir', target: `${bloomG}g · 0:00`, technique: `Start your timer, pour ${bloomG}g, and gently stir within the first 10s to wet every ground. Wait to 0:45.`, why: 'A thorough, stirred bloom wets all the grounds for an even extraction.' },
    { step: 'Main Pour', target: `${waterG}g · 0:45`, technique: `Pour in steady circles up to ${waterG}g, keeping the flow controlled.`, why: undefined },
    { step: 'Rao Spin', target: '~1:45', technique: 'Lift the dripper and give it a gentle swirl to flatten the bed.', why: 'A flat, even bed at the end means an even extraction.' },
    { step: 'Drawdown', target: `${waterG}g`, technique: 'Let it draw down fully — around 3:00.', why: undefined },
  ];
}

// Orea maker recipes — pulse pours from the brewer's own guide, scaled to the
// chosen brew weight via the pour plan (fractions of total water).
function oreaSteps({ doseG, waterG, brewWaterG, oreaIce = 0, oreaBypass = 0, pourPlan = [], totalTimeLabel, agitation }) {
  const bw = brewWaterG || waterG;
  const gentle = agitation === 'gentle';
  const steps = [];
  if (oreaIce > 0) {
    steps.push({ step: 'Ice the Carafe', target: `${oreaIce}g ice`, technique: `Add ${oreaIce}g ice to the server — you'll brew the hot water straight onto it.`, why: 'Flash-chilling locks in a bright, fresh iced cup.' });
  }
  steps.push({
    step: 'Rinse & dose',
    target: 'Prep',
    technique: `Rinse the paper filter with hot water and warm the brewer, then tip that water away. Add ${doseG}g of coffee and shake it level.`,
    why: 'Prep first — the clock starts with your first pour.',
  });
  pourPlan.forEach((pp, i) => {
    const g = i === pourPlan.length - 1 ? Math.round(bw) : Math.round(pp.f * bw);
    steps.push({
      step: i === 0 ? 'Pour 1 (bloom)' : `Pour ${i + 1}`,
      target: `${g}g · ${pp.t}`,
      technique: i === 0
        ? `Start your timer and spiral pour${gentle ? ' gently' : ''} to ${g}g to wet the bed.`
        : `When the water nearly reaches the bed, spiral pour${gentle ? ' gently' : ''} to ${g}g.`,
      why: i === 0 ? 'Orea pulse method — keep a ~5 g/s flow and pour as the bed almost drains.' : undefined,
    });
  });
  steps.push({ step: 'Drawdown', target: `${Math.round(bw)}g`, technique: `Let it draw down — about ${totalTimeLabel}.`, why: undefined });
  if (oreaBypass > 0) {
    steps.push({ step: 'Bypass', target: `+${oreaBypass}g`, technique: `Once drained, add ${oreaBypass}g hot water to taste to balance the cup.`, why: 'Bypass softens and cleans up the brew without weakening it.' });
  }
  return steps;
}

// Championship AeroPress — inverted concentrate, cooler water, bypass dilution.
function champSteps({ doseG, concWaterG, bypassG, tempC }) {
  return [
    { step: 'Set Up (inverted)', target: `${doseG}g`, technique: `Assemble the AeroPress inverted and add ${doseG}g of coffee.`, why: 'Full immersion with no early drip.' },
    { step: 'Add Water & Stir', target: `${concWaterG}g · 0:00`, technique: `Pour ${concWaterG}g of ${tempC}°C water and stir gently ~30 times.`, why: 'Cooler water keeps it sweet and clean, not harsh.' },
    { step: 'Steep', target: '~1:00', technique: 'Let it steep.', why: undefined },
    { step: 'Press', target: `${concWaterG}g`, technique: 'Cap with a damp filter, flip onto your cup, and press slowly (~30s). Stop at the hiss.', why: undefined },
    { step: 'Bypass', target: `+${bypassG}g`, technique: `Add ${bypassG}g hot water to taste — full strength, cleaner flavor.`, why: 'Dilution after a concentrated brew gives clarity without weakness.' },
  ];
}
