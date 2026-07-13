import type { SiteData } from '@/lib/types';

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveSiteData(data: SiteData): Promise<SaveResult> {
  try {
    const res = await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: json.error || `Помилка збереження (${res.status})` };
    }

    return { ok: true };
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
