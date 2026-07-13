/** Extract digits from a phone string. */
export function phoneDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Validate Ukrainian phone numbers.
 * Accepts +38 (0XX) XXX XX XX style masks with 12 digits (380…) or 10 digits (0…).
 */
export function isValidUaPhone(value: string): boolean {
  const digits = phoneDigits(value);
  if (digits.length === 12 && digits.startsWith('380')) return true;
  if (digits.length === 10 && digits.startsWith('0')) return true;
  if (digits.length === 9) return true; // local without leading 0
  return false;
}

export function normalizePhoneDisplay(value: string): string {
  return String(value || '').trim();
}
