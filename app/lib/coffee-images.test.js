import { describe, it, expect } from 'vitest';
import { extractImageCandidates, addImageCandidates, imageKey, fitWithin, MAX_IMAGE_OPTIONS } from './coffee-images';

const page = 'https://roaster.example/products/ethiopia-guji';

describe('coffee photo candidates', () => {
  it('collects og, JSON-LD and large <img> photos, best first, without duplicates', () => {
    const html = `
      <meta property="og:image" content="https://cdn.example/bag_1024x1024.jpg?v=3">
      <meta name="twitter:image" content="https://cdn.example/bag.jpg">
      <script type="application/ld+json">{"@type":"Product","image":["https://cdn.example/bag_600x.jpg","/files/farm.jpg"]}</script>
      <img src="/files/logo.png" width="120">
      <img src="/files/tiny.jpg" width="40" height="40">
      <img srcset="/files/cup_400.jpg 400w, /files/cup_1200.jpg 1200w" width="800">
      <img src="data:image/png;base64,AAAA">
      <img src="/files/badge-fair-trade.svg">`;
    const out = extractImageCandidates(html, page);
    expect(out[0]).toBe('https://cdn.example/bag_1024x1024.jpg?v=3');
    expect(out).toContain('https://roaster.example/files/farm.jpg');
    expect(out).toContain('https://roaster.example/files/cup_1200.jpg');
    // Same bag photo at other sizes is collapsed into one option.
    expect(out.filter(u => u.includes('/bag')).length).toBe(1);
    // Logos, tiny images, data: URLs and SVG badges are skipped.
    expect(out.some(u => /logo|tiny|badge|data:/.test(u))).toBe(false);
  });

  it('treats Shopify size variants as the same photo', () => {
    expect(imageKey('https://cdn.shopify.com/s/files/a/bag_600x.jpg?v=1')).toBe(imageKey('https://cdn.shopify.com/s/files/a/bag.jpg'));
    expect(imageKey('https://cdn.shopify.com/s/files/a/bag_1024x1024@2x.jpg')).toBe(imageKey('https://cdn.shopify.com/s/files/a/bag.jpg'));
  });

  it('caps the number of options and only keeps http(s) URLs', () => {
    const many = Array.from({ length: 30 }, (_, i) => `https://cdn.example/p${i}.jpg`);
    const out = addImageCandidates([], ['javascript:alert(1)', ...many], page);
    expect(out.length).toBe(MAX_IMAGE_OPTIONS);
    expect(out.every(u => u.startsWith('https://'))).toBe(true);
  });
});

describe('upload sizing', () => {
  it('shrinks the long edge to the max and never upscales', () => {
    expect(fitWithin(4000, 3000, 400)).toEqual({ width: 400, height: 300 });
    expect(fitWithin(1000, 2000, 400)).toEqual({ width: 200, height: 400 });
    expect(fitWithin(300, 200, 400)).toEqual({ width: 300, height: 200 });
  });
});
