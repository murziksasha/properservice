import { describe, expect, it } from 'vitest';
import { isValidUaPhone, phoneDigits } from './phone';

describe('phone', () => {
  it('extracts digits', () => {
    expect(phoneDigits('+38 (099) 538 56 55')).toBe('380995385655');
  });

  it('validates full UA number', () => {
    expect(isValidUaPhone('+38 (099) 538 56 55')).toBe(true);
    expect(isValidUaPhone('0995385655')).toBe(true);
  });

  it('rejects incomplete numbers', () => {
    expect(isValidUaPhone('+38 (099)')).toBe(false);
    expect(isValidUaPhone('')).toBe(false);
    expect(isValidUaPhone('abc')).toBe(false);
  });
});
