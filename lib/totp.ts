import { createHmac, timingSafeEqual } from 'crypto';

/** Base32 decode (RFC 4648), ignores spaces/padding. */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = input.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
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
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const str = (code % 10 ** digits).toString().padStart(digits, '0');
  return str;
}

/** Verify TOTP code (30s step, ±1 window). */
export function verifyTotp(secretBase32: string, token: string, window = 1): boolean {
  const secret = base32Decode(secretBase32);
  if (!secret.length) return false;
  const clean = String(token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    const expected = hotp(secret, step + w);
    try {
      if (timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return true;
    } catch {
      // length mismatch
    }
  }
  return false;
}

export function totpEnabled(): boolean {
  return Boolean(process.env.ADMIN_TOTP_SECRET?.trim());
}
