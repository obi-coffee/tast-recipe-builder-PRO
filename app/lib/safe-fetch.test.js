import { describe, it, expect } from 'vitest';
import { assertPublicUrl } from './safe-fetch';

describe('assertPublicUrl — SSRF guard', () => {
  it('rejects non-http(s) schemes', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(assertPublicUrl('ftp://example.com')).rejects.toThrow();
    await expect(assertPublicUrl('not a url')).rejects.toThrow('INVALID_URL');
  });

  it('blocks loopback, private, and cloud-metadata IP literals', async () => {
    for (const host of [
      'http://127.0.0.1/',
      'http://localhost.localhost'.replace('localhost.localhost', '127.0.0.1'),
      'http://0.0.0.0/',
      'http://10.0.0.5/',
      'http://192.168.1.1/',
      'http://172.16.0.1/',
      'http://169.254.169.254/latest/meta-data/', // AWS IMDS
      'http://[::1]/',
    ]) {
      await expect(assertPublicUrl(host), host).rejects.toThrow('BLOCKED_HOST');
    }
  });

  it('allows a public IP literal', async () => {
    await expect(assertPublicUrl('https://1.1.1.1/')).resolves.toBeTruthy();
  });
});
