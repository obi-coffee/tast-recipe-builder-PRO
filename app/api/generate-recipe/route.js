import { NextResponse } from 'next/server';
import { buildRecipe } from '../../lib/recipe-engine';
import { parseClaudeResponse } from '../../lib/api-helpers';
import { AI_MODEL } from '../../lib/ai-config';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Recipe generation is now DETERMINISTIC. The numbers, grind, and brew steps
 * come from the rules engine (app/lib/recipe-engine) — same inputs always
 * produce the same recipe, with no AI call and no API key required.
 *
 * AI is optional and only ever rewrites the descriptive copy (expectedProfile
 * + flavorNotes). Turn it on by setting USE_AI_PROSE=true and providing an
 * ANTHROPIC_API_KEY. Results are cached per coffee so we don't pay twice.
 */

const AI_PROSE_ENABLED = process.env.USE_AI_PROSE === 'true';
const proseCache = new Map();

function coffeeKey(coffeeData = {}) {
  const { name, origin, region, variety, process, roastLevel, notes } = coffeeData;
  return JSON.stringify({ name, origin, region, variety, process, roastLevel, notes });
}

async function generateProse(coffeeData, recipe) {
  const key = coffeeKey(coffeeData);
  if (proseCache.has(key)) return proseCache.get(key);

  const prompt = `You are a specialty coffee writer for the brand tāst. Write tasting copy for this coffee in a warm, precise voice (never call it "AI-powered", never gatekeep).

COFFEE: ${coffeeData.name || ''} | Origin: ${coffeeData.origin || '?'}${coffeeData.region ? ` (${coffeeData.region})` : ''} | Variety: ${coffeeData.variety || '?'} | Process: ${coffeeData.process || '?'} | Roast: ${coffeeData.roastLevel || '?'} | Roaster notes: ${coffeeData.notes || 'none'}
BREW: ${recipe.dose} dose, ${recipe.ratio}, ${recipe.temperature || 'ambient'}°C.

Respond with ONLY valid JSON, no markdown:
{"expectedProfile": "2-3 sentences on the expected cup", "flavorNotes": ["note1","note2","note3","note4"]}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 400,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  clearTimeout(timeoutId);

  if (!response.ok) throw new Error(`AI prose failed: ${response.status}`);
  const data = await response.json();
  const parsed = parseClaudeResponse(data);
  const prose = {
    expectedProfile: String(parsed.expectedProfile || '').trim(),
    flavorNotes: Array.isArray(parsed.flavorNotes) ? parsed.flavorNotes.slice(0, 4) : [],
  };
  proseCache.set(key, prose);
  return prose;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { coffeeData, brewData } = body;

    if (!coffeeData || !brewData) {
      return NextResponse.json({ error: 'Missing coffee or brew data' }, { status: 400 });
    }

    // Deterministic core — always runs, never fails on missing keys.
    const recipe = buildRecipe({ coffeeData, brewData });

    // Optional AI prose. If it errors, we keep the deterministic copy.
    if (AI_PROSE_ENABLED && process.env.ANTHROPIC_API_KEY) {
      try {
        const prose = await generateProse(coffeeData, recipe);
        if (prose.expectedProfile) recipe.expectedProfile = prose.expectedProfile;
        if (prose.flavorNotes.length) recipe.flavorNotes = prose.flavorNotes;
      } catch (e) {
        console.error('AI prose skipped:', e.message);
      }
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Generate recipe error:', error.message);
    return NextResponse.json(
      { error: 'Failed to build recipe. Please check your inputs and try again.' },
      { status: 500 }
    );
  }
}
