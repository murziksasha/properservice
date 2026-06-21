'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/menu', label: 'Меню' },
  { href: '/admin/pages', label: 'Сторінки' },
  { href: '/admin/goods', label: 'Товари' },
  { href: '/admin/settings', label: 'Налаштування' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      <h2>Proper Service</h2>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname === link.href ? 'active' : ''}
        >
          {link.label}
        </Link>
      ))}
      <button
        type="button"
        className="admin-btn admin-btn--secondary"
        style={{ marginTop: 24, width: '100%' }}
        onClick={async () => {
          await fetch('/api/auth', { method: 'DELETE' });
          window.location.href = '/admin/login';
        }}
      >
        Вийти
      </button>
    </nav>
  );
}