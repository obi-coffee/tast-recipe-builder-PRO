/**
 * Single source of truth for the AI model name.
 *
 * Every server route that calls the Anthropic API imports AI_MODEL from here,
 * so when a newer model ships you change it in ONE place (or set the
 * ANTHROPIC_MODEL environment variable in Vercel to override without editing code).
 */
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

module.exports = { AI_MODEL };
