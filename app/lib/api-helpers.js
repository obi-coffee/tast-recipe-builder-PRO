/**
 * Shared utilities for API routes.
 */

/**
 * Extract text from a Claude API response and parse it as JSON.
 * Handles markdown code fences and extra text around the JSON.
 */
function parseClaudeResponse(data) {
  if (!data.content || !Array.isArray(data.content)) {
    throw new Error('Unexpected API response structure');
  }

  const textContent = data.content
    .filter(item => item.type === 'text')
    .map(item => item.text)
    .join('');

  if (!textContent) {
    throw new Error('Empty API response');
  }

  let cleaned = textContent.replace(/```json|```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return JSON.parse(cleaned);
}

module.exports = { parseClaudeResponse };
