'use client';

import { openCookieSettings } from '@/lib/cookie-consent';

/** Footer control to review or change the stored device answer. */
export function CookieSettingsButton() {
  return (
    <button type='button' className='cookie-settings' onClick={openCookieSettings}>
      Налаштування cookie
    </button>
  );
}
