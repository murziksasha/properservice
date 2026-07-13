export const SESSION_COOKIE = 'admin_session';

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000; // 7 days

/**
 * Read secret at call time (not module load) so Docker runtime env is used.
 * Prefer SESSION_SECRET; fall back to ADMIN_PASSWORD for local convenience.
 */
function getSecret(): string {
  // Bracket access avoids some static replacements at build time
  const secret = process.env['SESSION_SECRET'] || process.env['ADMIN_PASSWORD'];
  if (!secret) {
    return 'dev-insecure-session-secret-change-me';
  }
  return secret;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(payload: string): Promise<string> {
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toHex(new Uint8Array(signature));
}

async function verifySignature(payload: string, signatureHex: string): Promise<boolean> {
  const key = await getHmacKey();
  const sig = fromHex(signatureHex);
  if (!sig) return false;
  try {
    // Copy into a fresh ArrayBuffer-backed view (TS + Edge/Node compatible)
    const sigCopy = new Uint8Array(sig);
    return await crypto.subtle.verify('HMAC', key, sigCopy, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}

/** Create a signed session cookie value: `token.expiry.signature` */
export async function createSessionToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = toHex(bytes);
  const expiry = String(Date.now() + SESSION_MAX_AGE_MS);
  const payload = `${token}.${expiry}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

/** Validate signed session cookie. */
export async function isValidSession(session: string | undefined): Promise<boolean> {
  if (!session) return false;

  const parts = session.split('.');
  if (parts.length !== 3) return false;

  const [token, expiry, signature] = parts;
  if (!token || !expiry || !signature) return false;

  const payload = `${token}.${expiry}`;
  const ok = await verifySignature(payload, signature);
  if (!ok) return false;

  const exp = Number(expiry);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  return true;
}

export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_MAX_AGE_MS / 1000);
