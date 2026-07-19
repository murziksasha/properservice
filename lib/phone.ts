/** Extract digits from a phone string. */
export function phoneDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/** Canonical UA mask / placeholder (shared by forms + CMS defaults). */
export const PHONE_MASK = '+38 (___) ___ __ __';
export const PHONE_PLACEHOLDER = '+38 (___) ___ __ __';

/**
 * Validate Ukrainian phone numbers.
 * Accepts full international (380 + 9) or national (0 + 9).
 */
export function isValidUaPhone(value: string): boolean {
  const digits = phoneDigits(value);
  if (digits.length === 12 && digits.startsWith('380')) return true;
  if (digits.length === 10 && digits.startsWith('0')) return true;
  return false;
}

export function normalizePhoneDisplay(value: string): string {
  return String(value || '').trim();
}

/** Build tel: href from display or stored tel field. */
export function formatTelHref(tel: string): string {
  const raw = String(tel || '').trim();
  if (!raw) return 'tel:';
  if (raw.startsWith('tel:')) return raw.replace(/\s/g, '');
  const digits = phoneDigits(raw);
  if (digits.length === 12 && digits.startsWith('380')) return `tel:+${digits}`;
  // national 0XXXXXXXXX → +380XXXXXXXXX
  if (digits.length === 10 && digits.startsWith('0')) return `tel:+38${digits}`;
  if (digits.length >= 9) return `tel:+${digits}`;
  return `tel:${raw.replace(/\s/g, '')}`;
}
