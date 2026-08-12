/**
 * Ratio-anchored recipe scaling (Phase 3).
 *
 * The engine produces a recipe from a target weight. On the recipe screen a
 * user can fine-tune it by hand. Ratio is the anchor:
 *   - edit Dose  → Water  = Dose × ratio
 *   - edit Water → Dose   = Water / ratio
 *   - edit Ratio → Water  = Dose × ratio (Dose held)
 *
 * scaleRecipe() takes the ORIGINAL engine recipe plus the chosen { dose, ratio }
 * and returns a new recipe with dose/water/ratio and every brew-step weight
 * rescaled. Grams attached to "coffee"/"dose" scale with the dose; all other
 * grams (pours, yield, ice, bypass) scale with the water. Times are untouched.
 *
 * Pure and deterministic — no state, no side effects.
 */

export function parseNum(str) {
  const m = String(str ?? '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

// Scale the gram values inside a piece of text, choosing dose vs water factor
// from the surrounding words.
function scaleGrams(text, waterFactor, doseFactor) {
  if (!text) return text;
  return String(text).replace(/(\d+(?:\.\d+)?)\s*g\b(\s*(?:of\s+)?coffee)?/gi, (match, num, coffeeSuffix, offset, full) => {
    const before = full.slice(Math.max(0, offset - 8), offset).toLowerCase();
    const rest = full.slice(offset + match.length).toLowerCase();
    // Dose-grams: "...g coffee", "Dose ...g", or the espresso prep target "...g in".
    const isDose = !!coffeeSuffix || /dose\s*$/.test(before) || /^\s*in\s*$/.test(rest);
    const f = isDose ? doseFactor : waterFactor;
    const scaled = Math.round(parseFloat(num) * f);
    return `${scaled}g${coffeeSuffix || ''}`;
  });
}

/**
 * @param recipe  original engine recipe
 * @param dose    desired dose in grams
 * @param ratio   desired water:coffee ratio (number, e.g. 16.8)
 * @param ratioDecimals  decimals to display on the ratio (defaults from recipe)
 */
export function scaleRecipe(recipe, { dose, ratio, ratioDecimals }) {
  const origDose = parseNum(recipe.dose);
  const origWater = parseNum(recipe.water);

  // 0.1 g dose resolution — fine enough that a water ± step lands within ~2 g of
  // the target instead of snapping in ~8 g jumps (dose × ratio).
  const newDose = Math.max(1, Math.round(dose * 10) / 10);
  const newWater = Math.max(1, Math.round(newDose * ratio));

  const passDecimals = ratioDecimals ?? ((recipe.ratio || '').split('.')[1]?.length || 1);
  // Unchanged model → return the recipe exactly as the engine produced it
  // (avoids a rounding drift like 300g → 302g falsely reading as "edited").
  if (newDose === origDose && `1:${ratio.toFixed(passDecimals)}` === recipe.ratio) {
    return recipe;
  }

  const waterFactor = origWater ? newWater / origWater : 1;
  const doseFactor = origDose ? newDose / origDose : 1;

  const decimals = ratioDecimals ?? ((recipe.ratio || '').split('.')[1]?.length || 1);
  const doseLabel = `${newDose}g`;

  const brewSteps = (recipe.brewSteps || []).map(s => ({
    ...s,
    target: scaleGrams(s.target, waterFactor, doseFactor),
    technique: scaleGrams(s.technique, waterFactor, doseFactor),
  }));

  return {
    ...recipe,
    dose: doseLabel,
    water: `${newWater}g`,
    ratio: `1:${ratio.toFixed(decimals)}`,
    brewSteps,
  };
}

/** Pull the editable model { dose, ratio } out of an engine recipe. */
export function recipeToModel(recipe) {
  const dose = parseNum(recipe.dose) || 18;
  const ratioNum = parseNum((recipe.ratio || '').split(':')[1] || recipe.ratio) || 16.8;
  const ratioDecimals = (recipe.ratio || '').split('.')[1]?.length ?? 1;
  return { dose, ratio: ratioNum, ratioDecimals };
}
