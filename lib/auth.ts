import { timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import {
  createSessionToken,
  isValidSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from './session';

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

/** Secure cookies only over HTTPS. Over plain HTTP (local Docker) set COOKIE_SECURE=false. */
function cookieSecureEnabled(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  // Default: secure in production (HTTPS). Local HTTP Docker must set COOKIE_SECURE=false.
  return process.env.NODE_ENV === 'production';
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = await createSessionToken();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecureEnabled(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireAuth(): Promise<void> {
  const isAuthenticated = await getSession();

  if (!isAuthenticated) {
    throw new Error('Unauthorized');
  }
}
