import { afterEach, describe, expect, it } from 'vitest';
import { clientKey, rateLimit, resetRateLimits } from './rate-limit';

describe('rateLimit', () => {
  it('allows up to limit then blocks', () => {
    resetRateLimits();
    const key = 'test:ip';
    const opts = { limit: 3, windowMs: 60_000 };

    expect(rateLimit(key, opts).allowed).toBe(true);
    expect(rateLimit(key, opts).allowed).toBe(true);
    expect(rateLimit(key, opts).allowed).toBe(true);
    expect(rateLimit(key, opts).allowed).toBe(false);
  });
});

describe('clientKey', () => {
  const prevProxy = process.env.TRUSTED_PROXY;

  afterEach(() => {
    if (prevProxy === undefined) delete process.env.TRUSTED_PROXY;
    else process.env.TRUSTED_PROXY = prevProxy;
  });

  it('TRUSTED_PROXY=true and both headers: key equals X-Real-IP', () => {
    process.env.TRUSTED_PROXY = 'true';
    const req = new Request('http://localhost/api/contact', {
      headers: {
        'x-real-ip': '192.168.1.50',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      },
    });
    expect(clientKey(req, 'contact')).toBe('contact:192.168.1.50');
  });

  it('TRUSTED_PROXY not set, client sent both headers: key direct, not address from header', () => {
    delete process.env.TRUSTED_PROXY;
    const req = new Request('http://localhost/api/contact', {
      headers: {
        'x-real-ip': '192.168.1.50',
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      },
    });
    expect(clientKey(req, 'contact')).toBe('contact:direct');
  });

  it('empty X-Real-IP when proxy enabled: key proxy-missing', () => {
    process.env.TRUSTED_PROXY = 'true';
    const req = new Request('http://localhost/api/contact');
    expect(clientKey(req, 'contact')).toBe('contact:proxy-missing');

    const reqEmpty = new Request('http://localhost/api/contact', {
      headers: { 'x-real-ip': '   ' },
    });
    expect(clientKey(reqEmpty, 'contact')).toBe('contact:proxy-missing');
  });
});
