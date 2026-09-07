'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  COOKIE_CONSENT_OPEN_EVENT,
  isConsentCurrent,
  readConsent,
  writeConsent,
  type CookieConsentChoice,
} from '@/lib/cookie-consent';

interface CookieBannerProps {
  privacyHref: string;
  privacyLabel: string;
}

function PrivacyLink({ href, label }: { href: string; label: string }) {
  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    return (
      <a href={href} target='_blank' rel='noopener noreferrer'>
        {label}
      </a>
    );
  }
  return <Link href={href}>{label}</Link>;
}

/**
 * Bottom-sticky public cookie question. Hidden until the device has no current
 * answer (avoids a flash for returning visitors). Not shown in admin.
 */
export function CookieBanner({ privacyHref, privacyLabel }: CookieBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isConsentCurrent(readConsent()));
    const onOpen = () => setVisible(true);
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (visible) {
      document.documentElement.dataset.cookieBanner = '1';
    } else {
      delete document.documentElement.dataset.cookieBanner;
    }
    return () => {
      delete document.documentElement.dataset.cookieBanner;
    };
  }, [visible]);

  const choose = useCallback((choice: CookieConsentChoice) => {
    writeConsent(choice);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className='cookie-banner'
      role='region'
      aria-labelledby='cookie-banner-title'
      aria-describedby='cookie-banner-text'
    >
      <div className='cookie-banner__inner'>
        <div className='cookie-banner__copy'>
          <p className='cookie-banner__title' id='cookie-banner-title'>
            Файли cookie
          </p>
          <p className='cookie-banner__text' id='cookie-banner-text'>
            Ми використовуємо необхідні cookie, щоб сайт працював і запамʼятовував ваші налаштування на цьому пристрої.
            За згодою підключаємо віджети зворотного звʼязку. Детальніше — у{' '}
            <PrivacyLink href={privacyHref} label={privacyLabel} />.
          </p>
        </div>
        <div className='cookie-banner__actions'>
          <button
            type='button'
            className='cookie-banner__btn cookie-banner__btn--ghost'
            onClick={() => choose('rejected')}
          >
            Лише необхідні
          </button>
          <button type='button' className='_btn cookie-banner__btn' onClick={() => choose('accepted')}>
            Прийняти
          </button>
        </div>
      </div>
    </div>
  );
}
