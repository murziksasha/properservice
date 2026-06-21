import Image from 'next/image';
import Link from 'next/link';
import type { SiteSettings } from '@/lib/types';

export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="footer">
      <div className="footer__wrapper wrapper">
        <div className="logo">
          <Link href="/">
            <Image src={settings.logo} alt="logo" width={120} height={40} />
          </Link>
        </div>
        <div className="policy">
          Використовуючи веб-сайт, Ви погоджуєтесь з умовами{' '}
          <Link href={settings.privacyPolicyUrl} target="_blank">{settings.privacyPolicyText}</Link>
        </div>
        <div className="copy">{settings.copyright}</div>
      </div>
    </footer>
  );
}