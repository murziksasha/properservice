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

/** Keep in sync with `_header.scss` drawer / overlay transition duration */
const MENU_CLOSE_MS = 280;

export function Header({ settings, menu }: HeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  /** Visual open state (CSS `.is-open`) */
  const [open, setOpen] = useState(false);
  /** Overlay stays mounted while closing so exit animation can play */
  const [overlayMounted, setOverlayMounted] = useState(false);
  const visibleMenu = menu.filter((item) => item.visible);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const telHref = formatTelHref(settings.headerPhone.tel);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    return () => document.body.classList.remove('nav-open');
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMenu();
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
    // Prefer the close control when the drawer opens
    closeBtnRef.current?.focus();

    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function openMenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOverlayMounted(true);
    // Next frame so overlay enter animation runs from opacity 0
    requestAnimationFrame(() => setOpen(true));
  }

  function closeMenu() {
    if (!open && !overlayMounted) return;
    setOpen(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOverlayMounted(false);
      closeTimerRef.current = null;
      burgerRef.current?.focus();
    }, MENU_CLOSE_MS);
  }

  function toggleMenu() {
    if (open) closeMenu();
    else openMenu();
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
            onClick={toggleMenu}
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            ref={navRef}
            id='site-nav'
            className={`menu${open ? ' is-open' : ''}${overlayMounted && !open ? ' is-closing' : ''}`}
            aria-modal={open || undefined}
            role={open || overlayMounted ? 'dialog' : undefined}
            aria-label='Головне меню'
            /* Only while the mobile drawer is closing — never inert on desktop nav */
            inert={overlayMounted && !open ? true : undefined}
          >
            <button
              ref={closeBtnRef}
              type='button'
              className='menu__close'
              aria-label='Закрити меню'
              onClick={closeMenu}
            >
              <span className='menu__close-icon' aria-hidden>
                <span />
                <span />
              </span>
            </button>
            <ul className='menu__list'>
              {!isHome ? (
                <li>
                  <Link href='/' className='_list-reset' onClick={closeMenu}>
                    На головну
                  </Link>
                </li>
              ) : null}
              {visibleMenu.map((item) => (
                <li key={item.id} className='_list-reset'>
                  <Link href={item.href} className='menu__link' onClick={closeMenu}>
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
      {overlayMounted ? (
        <button
          type='button'
          className={`header__overlay${open ? ' is-open' : ' is-closing'}`}
          aria-label='Закрити меню'
          tabIndex={open ? 0 : -1}
          onClick={closeMenu}
        />
      ) : null}
    </header>
  );
}
