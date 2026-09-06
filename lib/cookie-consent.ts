/**
 * Device-local cookie consent (public site).
 *
 * Dual-write: localStorage (canonical for this origin/device) + first-party
 * cookie (backup if storage is blocked). Versioned so a policy change can
 * re-prompt. Optional third-party widgets load only after `accepted`.
 */

export const COOKIE_CONSENT_KEY = 'ps-cookie-consent';
export const COOKIE_CONSENT_VERSION = 1;
/** 12 months — typical consent lifetime. */
export const COOKIE_CONSENT_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export const COOKIE_CONSENT_CHANGE_EVENT = 'ps-cookie-consent-change';
export const COOKIE_CONSENT_OPEN_EVENT = 'ps-cookie-consent-open';

export type CookieConsentChoice = 'accepted' | 'rejected';

export type CookieConsentRecord = {
  v: number;
  choice: CookieConsentChoice;
  at: string;
};

export function isCookieConsentChoice(value: unknown): value is CookieConsentChoice {
  return value === 'accepted' || value === 'rejected';
}

export function parseConsentRecord(raw: string | null | undefined): CookieConsentRecord | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (!isCookieConsentChoice(data.choice)) return null;
    if (typeof data.v !== 'number' || !Number.isFinite(data.v)) return null;
    const at = typeof data.at === 'string' && data.at ? data.at : '';
    return { v: data.v, choice: data.choice, at };
  } catch {
    return null;
  }
}

export function serializeConsentRecord(record: CookieConsentRecord): string {
  return JSON.stringify(record);
}

export function makeConsentRecord(choice: CookieConsentChoice, at = new Date()): CookieConsentRecord {
  return { v: COOKIE_CONSENT_VERSION, choice, at: at.toISOString() };
}

/** Stored answer applies only when the policy version still matches. */
export function isConsentCurrent(record: CookieConsentRecord | null): record is CookieConsentRecord {
  return record !== null && record.v === COOKIE_CONSENT_VERSION && isCookieConsentChoice(record.choice);
}

export function allowsOptionalCookies(record: CookieConsentRecord | null): boolean {
  return isConsentCurrent(record) && record.choice === 'accepted';
}

export function getCookieFromString(cookieHeader: string, name: string): string | null {
  if (!cookieHeader || !name) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }
  return null;
}

function readFromLocalStorage(): CookieConsentRecord | null {
  try {
    return parseConsentRecord(localStorage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    return null;
  }
}

function readFromCookie(): CookieConsentRecord | null {
  if (typeof document === 'undefined') return null;
  return parseConsentRecord(getCookieFromString(document.cookie, COOKIE_CONSENT_KEY));
}

function writeLocalStorage(serialized: string): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, serialized);
  } catch {
    /* private mode / quota */
  }
}

function writeCookie(serialized: string): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_CONSENT_KEY}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

function emitChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
}

export function readConsent(): CookieConsentRecord | null {
  if (typeof window === 'undefined') return null;
  const fromStorage = readFromLocalStorage();
  if (isConsentCurrent(fromStorage)) {
    // Keep cookie in sync so a later storage wipe still remembers the device.
    if (!isConsentCurrent(readFromCookie())) {
      writeCookie(serializeConsentRecord(fromStorage));
    }
    return fromStorage;
  }
  const fromCookie = readFromCookie();
  if (isConsentCurrent(fromCookie)) {
    writeLocalStorage(serializeConsentRecord(fromCookie));
    return fromCookie;
  }
  return fromStorage ?? fromCookie;
}

export function writeConsent(choice: CookieConsentChoice): CookieConsentRecord {
  const record = makeConsentRecord(choice);
  const serialized = serializeConsentRecord(record);
  writeLocalStorage(serialized);
  writeCookie(serialized);
  emitChange();
  return record;
}

export function openCookieSettings(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
}
