'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { COOKIE_CONSENT_CHANGE_EVENT, allowsOptionalCookies, readConsent } from '@/lib/cookie-consent';

/**
 * Third-party Gincore widgets (may set their own cookies). Load only after the
 * visitor accepted optional cookies on this device.
 */
export function GincoreWidgets() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(allowsOptionalCookies(readConsent()));
    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, sync);
  }, []);

  if (!allowed) return null;

  return (
    <>
      <Script src='https://remontservice.gincore.net/widget.php?ajax=&w=state&jquery=0' strategy='lazyOnload' />
      <Script src='https://remontservice.gincore.net/widget.php?ajax=&w=feedback&jquery=0' strategy='lazyOnload' />
    </>
  );
}
