'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { MenuItem, SiteSettings } from '@/lib/types';
import { formatTelHref } from '@/lib/phone';
import { TextSizeToggle } from './TextSizeToggle';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  settings: SiteSettings;
  menu: MenuItem[];
}

const SOCIAL_LABELS: Record<string, string> = {
  viber: 'Viber',
  telegram: 'Telegram',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

export function Header({ settings, menu }: HeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [open, setOpen] = useState(false);
  const visibleMenu = menu.filter((item) => item.visible);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const telHref = formatTelHref(settings.headerPhone.tel);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    return () => document.body.classList.remove('nav-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        burgerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !navRef.current) return;

      const focusable = navRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKey);
    // Focus first link in drawer
    const firstLink = navRef.current?.querySelector<HTMLElement>('a[href], button');
    firstLink?.focus();

    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function closeMenu() {
    setOpen(false);
    burgerRef.current?.focus();
  }

  return (
    <header className='header'>
      <div className='wrapper header__wrapper'>
        <div className='header__menu'>
          <div className='logo'>
            <Link href='/'>
              <Image src={settings.logo} alt='Proper Service' width={120} height={40} priority />
            </Link>
          </div>

          <a
            className='header__mobile-call'
            href={telHref}
            aria-label={`Зателефонувати ${settings.headerPhone.display}`}
          >
            <Image src='/img/icons/phone_btn.png' alt='' width={20} height={20} aria-hidden />
            <span>{settings.headerPhone.display}</span>
          </a>

          <button
            ref={burgerRef}
            type='button'
            className={`header__burger${open ? ' is-open' : ''}`}
            aria-label={open ? 'Закрити меню' : 'Відкрити меню'}
            aria-expanded={open}
            aria-controls='site-nav'
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            ref={navRef}
            id='site-nav'
            className={`menu${open ? ' is-open' : ''}`}
            aria-modal={open || undefined}
            role={open ? 'dialog' : undefined}
            aria-label='Головне меню'
          >
            <ul className='menu__list'>
              {!isHome ? (
                <li>
                  <Link href='/' className='_list-reset' onClick={() => setOpen(false)}>
                    На головну
                  </Link>
                </li>
              ) : null}
              {visibleMenu.map((item) => (
                <li key={item.id} className='_list-reset'>
                  <Link href={item.href} className='menu__link' onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className='menu__mobile-meta'>
              <p>{settings.hours}</p>
              <a className='_btn header__phone-btn' href={telHref}>
                <Image
                  src='/img/icons/phone_btn.png'
                  alt=''
                  width={20}
                  height={20}
                  aria-hidden
                  className='header__phone-btn__icon'
                />
                <span className='header__phone-btn__num'>{settings.headerPhone.display}</span>
              </a>
              <div className='menu__mobile-prefs'>
                <TextSizeToggle />
                <ThemeToggle />
              </div>
              <div className='menu__mobile-social'>
                {settings.social.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={SOCIAL_LABELS[link.type] || link.type}
                  >
                    <Image
                      src={link.icon}
                      alt={SOCIAL_LABELS[link.type] || link.type}
                      width={28}
                      height={28}
                    />
                  </a>
                ))}
              </div>
            </div>
          </nav>

          <div className='header__contact'>
            <p className='header__contact_time'>{settings.hours}</p>
            <div className='header__contact_callback'>
              <a className='header__phone-btn _btn' href={telHref}>
                <Image
                  src='/img/icons/phone_btn.png'
                  alt=''
                  className='header__phone-btn__icon'
                  width={22}
                  height={22}
                  aria-hidden
                />
                <span className='header__phone-btn__num'>{settings.headerPhone.display}</span>
              </a>
            </div>
            <div className='header__contact_row'>
              <div className='header__contact_social'>
                {settings.social.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={SOCIAL_LABELS[link.type] || link.type}
                  >
                    <Image
                      src={link.icon}
                      alt={SOCIAL_LABELS[link.type] || link.type}
                      width={24}
                      height={24}
                    />
                  </a>
                ))}
              </div>
              <div className='header__prefs'>
                <TextSizeToggle />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>
      {open ? (
        <button
          type='button'
          className='header__overlay'
          aria-label='Закрити меню'
          onClick={closeMenu}
        />
      ) : null}
    </header>
  );
}
