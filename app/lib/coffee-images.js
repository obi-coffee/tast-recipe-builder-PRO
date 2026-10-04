/**
 * Coffee photo helpers.
 *
 * Server side: collect every plausible product photo from a roaster's page so
 * the user can pick the one that shows up on their recipe (not just og:image).
 * Client side: shrink an uploaded photo to a small JPEG data URL so it can live
 * inside saved recipes and journal entries without bloating storage.
 */

export const MAX_IMAGE_OPTIONS = 12;

// Things that are almost never the coffee itself.
const JUNK = /(logo|icon|favicon|sprite|badge|payment|paypal|visa|mastercard|amex|klarna|afterpay|avatar|spinner|loader|placeholder|pixel|tracking|social|facebook|instagram|twitter|pinterest|tiktok|youtube|star|rating|flag|arrow|chevron|close|menu|cart|search)/i;

function resolveUrl(url, base) {
  if (!url) return '';
  try { return new URL(url.trim(), base).href; } catch { return ''; }
}

/** A stable key so the same image at different sizes/versions only appears once. */
export function imageKey(url) {
  try {
    const u = new URL(url);
    // Shopify/CDN size suffixes: foo_600x.jpg, foo_1024x1024.jpg, foo_600x600@2x.jpg
    const path = u.pathname.replace(/_(\d+x\d*|\d*x\d+)(@\dx)?(?=\.[a-z]+$)/i, '');
    return (u.host + path).toLowerCase();
  } catch {
    return String(url).toLowerCase();
  }
}

function isUsable(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  let path;
  try { path = new URL(url).pathname; } catch { return false; }
  if (/\.(svg|gif|ico)$/i.test(path)) return false;
  if (JUNK.test(path)) return false;
  return true;
}

/** Add unique, usable URLs to `out` (mutates), preserving order. */
export function addImageCandidates(out, urls, base) {
  const seen = new Set(out.map(imageKey));
  for (const raw of urls) {
    if (out.length >= MAX_IMAGE_OPTIONS) break;
    const url = resolveUrl(typeof raw === 'string' ? raw : raw?.url || raw?.src || '', base);
    if (!url || !isUsable(url)) continue;
    const key = imageKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

// Largest candidate in a srcset ("a.jpg 400w, b.jpg 800w") — or the last one.
function pickFromSrcset(srcset) {
  const parts = String(srcset).split(',').map(s => s.trim().split(/\s+/)).filter(p => p[0]);
  if (!parts.length) return '';
  let best = parts[parts.length - 1][0], bestW = 0;
  for (const [u, d] of parts) {
    const w = parseInt(d, 10) || 0;
    if (w > bestW) { best = u; bestW = w; }
  }
  return best;
}

function jsonLdImages(node, acc) {
  if (!node || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach(n => jsonLdImages(n, acc)); return acc; }
  const img = node.image;
  if (typeof img === 'string') acc.push(img);
  else if (Array.isArray(img)) img.forEach(i => acc.push(typeof i === 'string' ? i : i?.url || i?.contentUrl || ''));
  else if (img && typeof img === 'object') acc.push(img.url || img.contentUrl || '');
  if (node['@graph']) jsonLdImages(node['@graph'], acc);
  if (node.mainEntity) jsonLdImages(node.mainEntity, acc);
  return acc;
}

/**
 * Every plausible product photo on the page, best first:
 * og:image → twitter:image → JSON-LD product images → large <img> tags.
 */
export function extractImageCandidates(html, pageUrl) {
  const out = [];
  const metaFor = (name) => [
    ...html.matchAll(new RegExp(`<meta\\s+[^>]*(?:property|name)\\s*=\\s*["']${name}["'][^>]*content\\s*=\\s*["']([^"']+)["']`, 'gi')),
    ...html.matchAll(new RegExp(`<meta\\s+[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name)\\s*=\\s*["']${name}["']`, 'gi')),
  ].map(m => m[1]);

  addImageCandidates(out, metaFor('og:image(?::secure_url)?'), pageUrl);
  addImageCandidates(out, metaFor('twitter:image(?::src)?'), pageUrl);

  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { addImageCandidates(out, jsonLdImages(JSON.parse(m[1].trim()), []), pageUrl); } catch {}
  }

  // <img> tags: skip obviously small ones (explicit width/height under 200).
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (out.length >= MAX_IMAGE_OPTIONS) break;
    const tag = m[0];
    const attr = (n) => (tag.match(new RegExp(`\\s${n}\\s*=\\s*["']([^"']*)["']`, 'i')) || [])[1] || '';
    const w = parseInt(attr('width'), 10);
    const h = parseInt(attr('height'), 10);
    if ((w && w < 200) || (h && h < 200)) continue;
    const src = pickFromSrcset(attr('srcset') || attr('data-srcset')) || attr('data-src') || attr('src');
    if (src && !src.startsWith('data:')) addImageCandidates(out, [src.startsWith('//') ? 'https:' + src : src], pageUrl);
  }
  return out;
}

// ── Client side ────────────────────────────────────────────────────────

/** Scale (w, h) down so the longer edge is at most `max`. Never scales up. */
export function fitWithin(w, h, max) {
  if (!w || !h) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export const UPLOAD_MAX_EDGE = 400;
export const UPLOAD_QUALITY = 0.72;

/**
 * Shrink an uploaded photo to a small JPEG data URL (~20 KB). Small enough to
 * store inside saved recipes and journal entries, big enough for the recipe
 * header and journal thumbnails.
 */
export function shrinkImageFile(file, maxEdge = UPLOAD_MAX_EDGE, quality = UPLOAD_QUALITY) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || '')) { reject(new Error('NOT_IMAGE')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('DECODE_FAILED'));
      img.onload = () => {
        const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxEdge);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx || !width) { reject(new Error('CANVAS_FAILED')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
