/**
 * SSRF-safe server-side fetch.
 *
 * The coffee importer fetches arbitrary user-supplied URLs. Without protection,
 * a tester could point it at internal addresses (localhost, cloud metadata at
 * 169.254.169.254, RFC-1918 ranges) and read the response. assertPublicUrl()
 * resolves the host and rejects any private/loopback/link-local/reserved IP;
 * safeFetch() applies that check on the initial URL AND on every redirect hop
 * (a public URL can 302 to an internal one).
 *
 * Node runtime only (uses node:dns / node:net).
 */
import dns from 'node:dns/promises';
import net from 'node:net';

function ipIsBlocked(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 0) return true;                       // "this" network
    if (p[0] === 10) return true;                      // private
    if (p[0] === 127) return true;                     // loopback
    if (p[0] === 169 && p[1] === 254) return true;     // link-local / cloud metadata
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true; // private
    if (p[0] === 192 && p[1] === 168) return true;     // private
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    if (p[0] >= 224) return true;                      // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const a = ip.toLowerCase();
    if (a === '::1' || a === '::') return true;        // loopback / unspecified
    if (a.startsWith('fe80')) return true;             // link-local
    if (a.startsWith('fc') || a.startsWith('fd')) return true; // unique-local
    if (a.startsWith('::ffff:')) {                     // IPv4-mapped
      const v4 = a.split(':').pop();
      if (net.isIPv4(v4)) return ipIsBlocked(v4);
    }
    return false;
  }
  return true; // unknown form → reject
}

export async function assertPublicUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error('INVALID_URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('INVALID_URL');

  const host = u.hostname.replace(/^\[|\]$/g, '');
  let ips;
  if (net.isIP(host)) {
    ips = [host];
  } else {
    try {
      const res = await dns.lookup(host, { all: true });
      ips = res.map(r => r.address);
    } catch {
      throw new Error('DNS_FAIL');
    }
  }
  if (!ips.length) throw new Error('DNS_FAIL');
  for (const ip of ips) if (ipIsBlocked(ip)) throw new Error('BLOCKED_HOST');
  return u;
}

/**
 * fetch() that validates the host (and every redirect target) before hitting it.
 * Returns the final Response. Throws BLOCKED_HOST / INVALID_URL / DNS_FAIL /
 * TOO_MANY_REDIRECTS / AbortError.
 */
export async function safeFetch(rawUrl, { headers = {}, timeoutMs = 15000, maxRedirects = 3 } = {}) {
  let url = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, { headers, redirect: 'manual', signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      if (hop === maxRedirects) throw new Error('TOO_MANY_REDIRECTS');
      url = new URL(loc, url).href; // re-validated at the top of the next loop
      continue;
    }
    return res;
  }
  throw new Error('TOO_MANY_REDIRECTS');
}
