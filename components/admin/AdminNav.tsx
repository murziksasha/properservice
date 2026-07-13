'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/menu', label: 'Меню' },
  { href: '/admin/pages', label: 'Сторінки' },
  { href: '/admin/goods', label: 'Товари' },
  { href: '/admin/settings', label: 'Налаштування' },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <button
        type='button'
        className='admin-nav-toggle'
        aria-label={open ? 'Закрити навігацію' : 'Відкрити навігацію'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ☰ Меню
      </button>
      {open ? <button type='button' className='admin-nav-overlay' aria-label='Закрити' onClick={() => setOpen(false)} /> : null}
      <nav className={`admin-nav${open ? ' is-open' : ''}`}>
        <h2>Proper Service</h2>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={isActive(link.href, link.exact) ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <button
          type='button'
          className='admin-btn admin-btn--secondary admin-nav-logout'
          onClick={async () => {
            await fetch('/api/auth', { method: 'DELETE' });
            window.location.href = '/admin/login';
          }}
        >
          Вийти
        </button>
      </nav>
    </>
  );
}
