'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MenuItem, SiteSettings } from '@/lib/types';

interface HeaderProps {
  settings: SiteSettings;
  menu: MenuItem[];
  variant?: 'home' | 'inner';
}

export function Header({ settings, menu, variant = 'home' }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const visibleMenu = menu.filter((item) => item.visible);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    return () => document.body.classList.remove('nav-open');
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className='header'>
      <div className='wrapper header__wrapper'>
        <div className='header__menu'>
          <div className='logo'>
            <Link href='/'>
              <Image src={settings.logo} alt='Proper Service' width={120} height={40} />
            </Link>
          </div>

          <button
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

          <nav id='site-nav' className={`menu${open ? ' is-open' : ''}`}>
            <ul className='menu__list'>
              {variant === 'inner' ? (
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
          </nav>

          <div className='header__contact'>
            <p className='header__contact header__contact_time'>{settings.hours}</p>
            <div className='header__contact header__contact_callback'>
              <a className='header__contact header__contact_btn _btn' href={`tel:${settings.headerPhone.tel}`}>
                <div>
                  <Image
                    src='/img/icons/phone_btn.png'
                    alt=''
                    className='header__contact header__contact_phone'
                    width={20}
                    height={20}
                    aria-hidden
                  />
                </div>
                <div>{settings.headerPhone.display}</div>
              </a>
            </div>
            <div className='header__contact header__contact_social'>
              {settings.social.map((link) => (
                <a key={link.id} href={link.url} target='_blank' rel='noreferrer'>
                  <Image src={link.icon} alt={link.type} width={24} height={24} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      {open ? (
        <button type='button' className='header__overlay' aria-label='Закрити меню' onClick={() => setOpen(false)} />
      ) : null}
    </header>
  );
}
