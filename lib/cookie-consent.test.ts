import { describe, expect, it } from 'vitest';
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_VERSION,
  allowsOptionalCookies,
  getCookieFromString,
  isConsentCurrent,
  isCookieConsentChoice,
  makeConsentRecord,
  parseConsentRecord,
  serializeConsentRecord,
} from './cookie-consent';

describe('cookie-consent', () => {
  it('accepts only accepted | rejected', () => {
    expect(isCookieConsentChoice('accepted')).toBe(true);
    expect(isCookieConsentChoice('rejected')).toBe(true);
    expect(isCookieConsentChoice('all')).toBe(false);
    expect(isCookieConsentChoice('')).toBe(false);
  });

  it('round-trips a valid record', () => {
    const rec = makeConsentRecord('accepted', new Date('2026-09-06T12:00:00.000Z'));
    expect(rec.v).toBe(COOKIE_CONSENT_VERSION);
    expect(rec.choice).toBe('accepted');
    expect(parseConsentRecord(serializeConsentRecord(rec))).toEqual(rec);
  });

  it('parses null / junk as empty', () => {
    expect(parseConsentRecord(null)).toBeNull();
    expect(parseConsentRecord('')).toBeNull();
    expect(parseConsentRecord('{')).toBeNull();
    expect(parseConsentRecord('{"choice":"maybe","v":1}')).toBeNull();
  });

  it('treats other versions as stale', () => {
    const stale = parseConsentRecord(JSON.stringify({ v: COOKIE_CONSENT_VERSION + 1, choice: 'accepted', at: 'x' }));
    expect(isConsentCurrent(stale)).toBe(false);
    expect(allowsOptionalCookies(stale)).toBe(false);
  });

  it('optional cookies only after current accept', () => {
    expect(allowsOptionalCookies(null)).toBe(false);
    expect(allowsOptionalCookies(makeConsentRecord('rejected'))).toBe(false);
    expect(allowsOptionalCookies(makeConsentRecord('accepted'))).toBe(true);
  });

  it('reads named cookie from a header string', () => {
    const header = `theme=dark; ${COOKIE_CONSENT_KEY}=${encodeURIComponent('{"v":1,"choice":"rejected","at":"t"}')}; other=1`;
    const raw = getCookieFromString(header, COOKIE_CONSENT_KEY);
    expect(parseConsentRecord(raw)?.choice).toBe('rejected');
    expect(getCookieFromString(header, 'missing')).toBeNull();
  });
});
