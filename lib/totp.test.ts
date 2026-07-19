import { describe, expect, it } from 'vitest';
import { createHmac } from 'crypto';
import { verifyTotp } from './totp';

// Known test vector: secret "JBSWY3DPEHPK3PXP" is "Hello!" in base32 for common demos
// We generate a valid code for current step using the same algorithm inline for assertion.

function hotp(secretB32: string, counter: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = secretB32.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const c of cleaned) {
    const val = alphabet.indexOf(c);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  const secret = Buffer.from(bytes);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

describe('totp', () => {
  it('accepts current window code', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const step = Math.floor(Date.now() / 1000 / 30);
    const code = hotp(secret, step);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('rejects bad code', () => {
    expect(verifyTotp('JBSWY3DPEHPK3PXP', '000000')).toBe(false);
    expect(verifyTotp('JBSWY3DPEHPK3PXP', 'abc')).toBe(false);
  });
});
