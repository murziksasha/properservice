import Image from 'next/image';
import Link from 'next/link';
import type { MenuItem, SiteSettings } from '@/lib/types';

interface HeaderProps {
  settings: SiteSettings;
  menu: MenuItem[];
  variant?: 'home' | 'inner';
}

export function Header({ settings, menu, variant = 'home' }: HeaderProps) {
  return (
    <header className="header">
      <div className="wrapper header__wrapper">
        <div className="header__menu">
          <div className="logo">
            <Link href="/">
              <Image src={settings.logo} alt="logo" width={120} height={40} />
            </Link>
          </div>
          <nav className="menu">
            <ul className="menu__list">
              {variant === 'inner' ? (
                <li>
                  <Link href="/" className="_list-reset">На головну</Link>
                </li>
              ) : null}
              {menu.filter((item) => item.visible).map((item) => (
                <li key={item.id} className="_list-reset">
                  <Link href={item.href} className="menu__link">{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="header__contact">
            <p className="header__contact header__contact_time">{settings.hours}</p>
            <div className="header__contact header__contact_callback">
              <a className="header__contact header__contact_btn _btn" href={`tel:${settings.headerPhone.tel}`}>
                <div>
                  <Image src="/img/icons/phone_btn.png" alt="phone" className="header__contact header__contact_phone" width={20} height={20} />
                </div>
                <div>{settings.headerPhone.display}</div>
              </a>
            </div>
            <div className="header__contact header__contact_social">
              {settings.social.map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                  <Image src={link.icon} alt={link.type} width={24} height={24} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}