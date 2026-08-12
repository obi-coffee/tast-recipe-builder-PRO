import { NextResponse } from 'next/server';
import { getGrinderPromptContext } from '../../data/grinders';
import { parseClaudeResponse } from '../../lib/api-helpers';
import { AI_MODEL } from '../../lib/ai-config';
import { rateLimit, clientIp } from '../../lib/rate-limit';

// Vercel serverless function config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { ok } = rateLimit(`dialin:${clientIp(request)}`, { limit: 15, windowMs: 60000 });
    if (!ok) {
      return NextResponse.json({ error: 'A bit too fast — give it a moment and tap Dial It In again.' }, { status: 429 });
    }

    const body = await request.json();
    const { recipe, coffeeData, brewData, feedback } = body;

    if (!recipe || !feedback) {
      return NextResponse.json({ error: 'Missing recipe or feedback' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Missing ANTHROPIC_API_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const prompt = `You are James Hoffmann, World Barista Champion and extraction science expert. A user has brewed coffee using your recipe and is reporting issues. Diagnose the problem and provide precise adjustments.

ORIGINAL RECIPE:
- Dose: ${recipe.dose}
- Water: ${recipe.water}
- Ratio: ${recipe.ratio}
- Temperature: ${recipe.temperature}°C
- Grind: ${recipe.grindSetting} (${brewData.grinder})
- Device: ${brewData.device}
- Total Time: ${recipe.totalTime}

COFFEE:
- Origin: ${coffeeData.origin} ${coffeeData.region ? `(${coffeeData.region})` : ''}
- Variety: ${coffeeData.variety || 'Not specified'}
- Process: ${coffeeData.process || 'Not specified'}
- Roast: ${coffeeData.roastLevel || 'Not specified'}

USER FEEDBACK:
"${feedback}"

DIAGNOSTIC FRAMEWORK:
1. TIMING ISSUES:
   - Fast drawdown (<2:30 for 300g): Grind too coarse, pour too aggressive, channeling
   - Slow drawdown (>4:00 for 300g): Grind too fine, too many fines, clogged filter

2. TASTE ISSUES:
   - Sour/acidic/thin/tea-like: Under-extracted → grind finer, increase temp, extend time
   - Bitter/astringent/harsh: Over-extracted → grind coarser, decrease temp, faster pours
   - Muddy/muted/flat: Stale coffee, wrong temp, or extraction plateau
   - Fermented/boozy/overripe: Natural process over-extracted, reduce temp and contact time
   - Papery/cardboard: Filter not rinsed, stale coffee, or severe under-extraction
   - Salty/metallic: Water chemistry issue or very under-extracted

3. BODY ISSUES:
   - Too thin: Under-extracted, try finer grind or higher ratio (less water)
   - Too heavy/sludgy: Too fine, fines migration, or immersion-style over-steep

4. BED ISSUES:
   - Channeling (uneven bed): Pour technique, grind distribution, or static
   - Domed bed: Grind too fine, water draining around edges
   - Cratered bed: Pouring too aggressively in center

GRINDER SETTING REFERENCE for ${brewData.grinder}:
${getGrinderPromptContext(brewData.grinder)}

Provide specific, actionable adjustments using this grinder's native units AND exact increments. Follow the grinder description above precisely — if it says 0.25 increments, adjustments and the updated grindSetting must use 0.25 steps (e.g., "from 3.5 to 3.25"), not arbitrary decimals. If it uses clicks, use whole click counts. The grindSetting must be a value that physically exists on this grinder.

Respond with ONLY this JSON (no markdown):
{
  "diagnosis": "1-2 sentence explanation of the likely cause",
  "adjustments": [
    {"parameter": "Grind", "change": "specific adjustment", "reason": "why this helps"},
    {"parameter": "Temperature", "change": "specific adjustment", "reason": "why this helps"}
  ],
  "technique": "Any pour technique or process adjustments to try",
  "updatedRecipe": {
    "dose": "${recipe.dose}",
    "water": "${recipe.water}",
    "ratio": "${recipe.ratio}",
    "temperature": "adjusted temp as number only",
    "grindSetting": "Start: [adjusted setting]. Range: [fine end]–[coarse end]. Adjust finer if [reason], coarser if [reason].",
    "totalTime": "expected new time range"
  },
  "nextSteps": "What to look for in the next cup to continue dialing in"
}`;

    // Retry transient 429/5xx errors (rate limit, overloaded, internal).
    let response;
    let lastStatus = 0;
    let lastErrText = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: AI_MODEL,
            max_tokens: 1000,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }]
          })
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.ok) break;

      lastStatus = response.status;
      lastErrText = await response.text().catch(() => '');
      console.error(`Claude API error (attempt ${attempt + 1}):`, response.status, lastErrText);
      const transient = response.status === 429 || response.status >= 500;
      if (!transient || attempt === 2) break;
      await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
    }

    if (!response.ok) {
      let detail = '';
      try { detail = JSON.parse(lastErrText)?.error?.message || ''; } catch {}
      const err = new Error(`API returned ${lastStatus}`);
      err.statusCode = lastStatus;
      err.apiDetail = detail;
      throw err;
    }

    const data = await response.json();
    const parsed = parseClaudeResponse(data);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Dial-in error:', error.message);
    let message;
    if (error.name === 'AbortError') {
      message = 'Request timed out. Please try again.';
    } else if (error.statusCode === 429 || error.statusCode >= 500) {
      message = 'The AI service is briefly unavailable. Please tap Dial It In again in a moment.';
    } else if (error.apiDetail) {
      message = `AI service error (${error.statusCode}): ${error.apiDetail}`;
    } else {
      message = error.message?.includes('JSON')
        ? 'Could not parse dial-in response. Please try again.'
        : 'Failed to process feedback. Please try again.';
    }
    return NextResponse.json({ error: message }, { status: error.statusCode || 500 });
  }
}
