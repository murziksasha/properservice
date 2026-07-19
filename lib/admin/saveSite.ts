import type { SiteData } from '@/lib/types';
import { parseRetryAfterSeconds, rateLimitMessage } from './rateLimitUi';

export type SaveResult =
  | { ok: true; updatedAt?: string }
  | { ok: false; error: string; conflict?: boolean };

export async function saveSiteData(data: SiteData): Promise<SaveResult> {
  try {
    const res = await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 429) {
        const seconds = parseRetryAfterSeconds(res, 60);
        return { ok: false, error: rateLimitMessage(seconds, 'save') };
      }
      if (res.status === 409) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        return {
          ok: false,
          conflict: true,
          error: json.error || 'Дані змінені іншим сеансом. Оновіть сторінку.',
        };
      }
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: json.error || `Помилка збереження (${res.status})` };
    }

    const json = (await res.json().catch(() => ({}))) as { updatedAt?: string };
    return { ok: true, updatedAt: json.updatedAt };
  } catch {
    return { ok: false, error: 'Мережева помилка' };
  }
}

export async function fetchSiteData(): Promise<SiteData | null> {
  try {
    const res = await fetch('/api/site');
    if (!res.ok) return null;
    return (await res.json()) as SiteData;
  } catch {
    return null;
  }
}
