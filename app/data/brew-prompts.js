/**
 * Ambient brew-along prompts — short tāst-voice lines that crossfade in while
 * you pour. Intimate register: warm, unhurried, fragments fine, a little
 * poetry, a few playful winks. Never gatekeeping, never preachy.
 *
 * They're decorative encouragement, not instructions — the step's own
 * technique line always carries the how-to.
 */
export const BREW_PROMPTS = [
  // — pace & technique —
  'Controlled pours — not too fast, not too slow.',
  'Keep the stream thin and steady.',
  'Pour from low. Let the water fall gently.',
  'Wet every ground. No dry pockets.',
  'Slow spirals — out to the edge and back.',
  'Let the bed breathe between pours.',
  'Keep the water off the filter walls.',
  'Pour to the number, not past it.',
  'Let it drain before the next pour.',
  'A gentle swirl evens the bed.',
  'Soft start. The bloom sets the tone.',
  'Steady hands, steady cup.',
  'Find a pace you could repeat tomorrow.',
  'Small pours, big difference.',
  'Watch the bloom rise, then settle.',

  // — patience & presence —
  'Patience here. Don’t rush the draw.',
  'This is your three minutes. Be here for them.',
  'Slow is smooth. Smooth is sweet.',
  'There’s no rushing a bloom.',
  'Stay with it. Almost there.',
  'Let the morning catch up to you.',
  'Quiet hands, clear cup.',
  'This is the part worth slowing down for.',
  'Notice the smell right about now.',
  'Phone down. Coffee up.',

  // — brand soul —
  'Coffee is craft, and craft is care.',
  'Brewing is rhythmic. Feel the rhythm.',
  'Water, ground, time. That’s the whole secret.',
  'Every pour is a small act of attention.',
  'You’re not making coffee. You’re keeping time.',
  'Care shows up in the cup.',
  'The kettle, the bed, your breath — one tempo.',
  'A ritual you’ll want again tomorrow.',
  'The good stuff rewards patience.',
  'Good coffee is mostly just paying attention.',

  // — playful winks —
  'No gooseneck? This one’s a workout. Might be time to level up, champ.',
  'Resist the urge to stir. We see you.',
  'Pour like nobody’s watching. We’re not.',
  'The bed’s flat, the vibe’s flat. Both good.',
  'One day this’ll be muscle memory.',
  'Nobody ever rushed a great cup.',
  'Trust the process — and the bloom.',
  'Yes, you can taste the difference. Mostly.',

  // — for the coffee-curious —
  'First time? You’re already doing it right.',
  'There’s no perfect pour. Just yours.',
  'Off by a few grams? It’s fine. Keep going.',
  'You’ll dial this in, brew by brew.',
  'Every barista started exactly here.',
  'When in doubt, slow down.',
  'Mistakes still make coffee. Keep pouring.',
  'You’ve got this. One pour at a time.',
];

/** A random prompt, optionally avoiding the one currently shown. */
export function nextPrompt(current) {
  if (BREW_PROMPTS.length < 2) return BREW_PROMPTS[0] || '';
  let p = current;
  while (p === current) p = BREW_PROMPTS[Math.floor(Math.random() * BREW_PROMPTS.length)];
  return p;
}
