import Image from 'next/image';
import Link from 'next/link';
import type { SiteSettings } from '@/lib/types';

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  let copyright = (settings.copyright || '').trim() || `© ${year} Proper Service`;
  copyright = copyright.replace(/©\s*2017\b/, `© ${year}`);
  if (!/©\s*\d{4}/.test(copyright) && copyright.startsWith('©')) {
    copyright = copyright.replace(/^©\s*/, `© ${year} `);
  }

  return (
    <footer className='footer'>
      <div className='footer__wrapper wrapper'>
        <div className='logo'>
          <Link href='/'>
            <Image src={settings.logo} alt='Proper Service' width={120} height={40} />
          </Link>
        </div>
        <div className='policy'>
          Використовуючи веб-сайт, Ви погоджуєтесь з умовами{' '}
          <Link href={settings.privacyPolicyUrl} target='_blank'>
            {settings.privacyPolicyText}
          </Link>
        </div>
        <div className='copy'>{copyright}</div>
      </div>
    </footer>
  );
}
