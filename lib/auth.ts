import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import {
  createSessionToken,
  isValidSession,
  parseSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  type SessionClaims,
} from './session';
import { getAdminUserByUsername, hasMultiUserMode, verifyPasswordHash, type AdminRole } from './admin-users';
import { isSessionAllowed } from './admin-sessions';

function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !password) {
    return false;
  }

  return safeCompare(password, adminPassword);
}

/** Verify password for step-up actions: matches owner's scrypt hash when users exist, or ADMIN_PASSWORD in single-user mode. */
export async function verifyOwnerStepUp(password: string, username?: string): Promise<boolean> {
  const multi = await hasMultiUserMode();
  if (!multi) {
    return verifyPassword(password);
  }
  if (!username) return false;
  const user = await getAdminUserByUsername(username);
  if (user && user.role === 'owner' && verifyPasswordHash(password, user.passwordHash)) {
    return true;
  }
  return false;
}

/** Secure cookies only over HTTPS. Over plain HTTP (local Docker) set COOKIE_SECURE=false. */
function cookieSecureEnabled(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

export type LoginResult = { ok: true; claims: SessionClaims } | { ok: false; error: string };

/**
 * Authenticate: multi-user (username+password against admins.json) OR legacy ADMIN_PASSWORD.
 */
export async function authenticateLogin(input: { password: string; username?: string }): Promise<LoginResult> {
  const multi = await hasMultiUserMode();
  const username = (input.username || '').trim();

  if (multi) {
    if (!username) {
      return { ok: false, error: 'Invalid credentials' };
    }
    const user = await getAdminUserByUsername(username);
    if (!user || !verifyPasswordHash(input.password, user.passwordHash)) {
      return { ok: false, error: 'Invalid credentials' };
    }
    return { ok: true, claims: { username: user.username, role: user.role } };
  }

  // Single-user mode (hasMultiUserMode() === false): login via ADMIN_PASSWORD
  if (!username || username.toLowerCase() === 'admin') {
    if (verifyPassword(input.password)) {
      return { ok: true, claims: { username: 'admin', role: 'legacy' } };
    }
  }

  return { ok: false, error: 'Invalid password' };
}

export async function createSession(claims?: SessionClaims): Promise<string> {
  const cookieStore = await cookies();
  const token = await createSessionToken(claims);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecureEnabled(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: cookieSecureEnabled(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(value))) return false;
  const parsed = await parseSession(value);
  if (parsed.fingerprint && !(await isSessionAllowed(parsed.fingerprint))) return false;
  const claims = parsed.claims || { username: 'admin', role: 'legacy' };
  if ((await hasMultiUserMode()) && claims.role === 'legacy') return false;
  return true;
}

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  const parsed = await parseSession(value);
  if (!parsed.valid) return null;
  if (parsed.fingerprint && !(await isSessionAllowed(parsed.fingerprint))) return null;
  const claims = parsed.claims || { username: 'admin', role: 'legacy' };
  if ((await hasMultiUserMode()) && claims.role === 'legacy') return null;
  return claims;
}

export async function getSessionFingerprint(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  const parsed = await parseSession(value);
  if (!parsed.valid) return null;
  return parsed.fingerprint || null;
}

export async function requireAuth(): Promise<void> {
  const isAuthenticated = await getSession();

  if (!isAuthenticated) {
    throw new Error('Unauthorized');
  }
}

export type { AdminRole };
