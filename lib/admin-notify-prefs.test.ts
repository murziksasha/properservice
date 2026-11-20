import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFY_PREFS, isQuietNow, loadNotifyPrefs, readNotifyPrefs, shouldNotify } from './admin-notify-prefs';

describe('admin-notify-prefs', () => {
  it('quiet overnight window', () => {
    const prefs = { ...DEFAULT_NOTIFY_PREFS, quietStart: 22, quietEnd: 8 };
    expect(isQuietNow(prefs, new Date(2026, 0, 1, 23, 0))).toBe(true);
    expect(isQuietNow(prefs, new Date(2026, 0, 1, 7, 0))).toBe(true);
    expect(isQuietNow(prefs, new Date(2026, 0, 1, 12, 0))).toBe(false);
  });

  it('mute blocks all', () => {
    const prefs = { ...DEFAULT_NOTIFY_PREFS, mute: true };
    expect(shouldNotify(prefs, 'order')).toBe(false);
  });

  it('ordersOnly skips leads', () => {
    const prefs = { ...DEFAULT_NOTIFY_PREFS, ordersOnly: true, quietStart: 0, quietEnd: 0 };
    // quietStart===quietEnd disables quiet
    expect(shouldNotify(prefs, 'lead', new Date(2026, 0, 1, 12))).toBe(false);
    expect(shouldNotify(prefs, 'order', new Date(2026, 0, 1, 12))).toBe(true);
  });

  it('битий JSON у localStorage викидає помилку і не підсовує дефолт', () => {
    const mockStorage: Record<string, string> = {
      'admin-notify-prefs-v1': '{"corrupt: json',
    };
    const prevWindow = (globalThis as unknown as { window: unknown }).window;
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
      },
    };

    try {
      expect(() => readNotifyPrefs()).toThrow();
    } finally {
      (globalThis as unknown as { window: unknown }).window = prevWindow;
    }
  });

  it('у сховищі битий рядок, loadNotifyPrefs() повертає дефолт, getItem після виклику показує той самий битий рядок', () => {
    const corruptJson = '{"corrupt: json';
    const mockStorage: Record<string, string> = {
      'admin-notify-prefs-v1': corruptJson,
    };
    const prevWindow = (globalThis as unknown as { window: unknown }).window;
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
      },
    };

    try {
      const prefs = loadNotifyPrefs();
      expect(prefs).toEqual(DEFAULT_NOTIFY_PREFS);
      expect(window.localStorage.getItem('admin-notify-prefs-v1')).toBe(corruptJson);
    } finally {
      (globalThis as unknown as { window: unknown }).window = prevWindow;
    }
  });
});
