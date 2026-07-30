'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Box,
  ClipboardList,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  X,
} from 'lucide-react';

const LINKS: Array<{ href: string; label: string; icon: LucideIcon; exact?: boolean }> = [
  { href: '/admin', label: 'Огляд', icon: LayoutDashboard, exact: true },
  { href: '/admin/leads', label: 'Заявки', icon: ClipboardList },
  { href: '/admin/orders', label: 'Замовлення', icon: ShoppingCart },
  { href: '/admin/menu', label: 'Меню', icon: List },
  { href: '/admin/pages', label: 'Сторінки', icon: FileText },
  { href: '/admin/goods', label: 'Товари', icon: Box },
  { href: '/admin/media', label: 'Медіатека', icon: ImageIcon },
  { href: '/admin/settings', label: 'Налаштування', icon: Settings },
];

type AdminNavProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
};

export function AdminNav({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onToggleMobile,
  onCloseMobile,
}: AdminNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseMobile();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  useEffect(() => {
    onCloseMobile();
  }, [pathname, onCloseMobile]);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <button
        type='button'
        className='admin-nav-toggle admin-nav-toggle--mobile'
        aria-label={mobileOpen ? 'Закрити навігацію' : 'Відкрити навігацію'}
        aria-expanded={mobileOpen}
        onClick={onToggleMobile}
      >
        {mobileOpen ? <X size={22} strokeWidth={2} aria-hidden /> : <Menu size={22} strokeWidth={2} aria-hidden />}
      </button>

      {mobileOpen ? (
        <button type='button' className='admin-nav-overlay' aria-label='Закрити' onClick={onCloseMobile} />
      ) : null}

      <nav
        className={`admin-nav${mobileOpen ? ' is-open' : ''}${collapsed ? ' is-collapsed' : ''}`}
        aria-label='Адмін-навігація'
      >
        <div className='admin-nav-brand'>
          <span className='admin-nav-brand-mark' aria-hidden>
            PS
          </span>
          <h2 className='admin-nav-brand-text'>Proper Service</h2>
          <button
            type='button'
            className='admin-nav-collapse-btn'
            aria-label={collapsed ? 'Розгорнути меню' : 'Згорнути меню'}
            title={collapsed ? 'Розгорнути' : 'Згорнути'}
            onClick={onToggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen size={20} strokeWidth={2} aria-hidden />
            ) : (
              <PanelLeftClose size={20} strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>

        <div className='admin-nav-links'>
          {LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? 'active' : ''}
                title={link.label}
                aria-current={active ? 'page' : undefined}
                onClick={onCloseMobile}
              >
                <Icon className='admin-nav-icon' size={20} strokeWidth={2} aria-hidden />
                <span className='admin-nav-label'>{link.label}</span>
              </Link>
            );
          })}
        </div>

        <div className='admin-nav-footer'>
          <a
            href='/'
            target='_blank'
            rel='noreferrer'
            className='admin-nav-site'
            title='Відкрити сайт'
            onClick={onCloseMobile}
          >
            <ExternalLink className='admin-nav-icon' size={20} strokeWidth={2} aria-hidden />
            <span className='admin-nav-label'>Сайт</span>
          </a>
          <button
            type='button'
            className='admin-nav-logout'
            title='Вийти'
            onClick={async () => {
              if (
                !window.confirm(
                  'Вийти з адмінки? Незбережені зміни в інших вкладках можуть втратитися.',
                )
              ) {
                return;
              }
              await fetch('/api/auth', { method: 'DELETE' });
              window.location.href = '/admin/login';
            }}
          >
            <LogOut className='admin-nav-icon' size={20} strokeWidth={2} aria-hidden />
            <span className='admin-nav-label'>Вийти</span>
          </button>
        </div>
      </nav>
    </>
  );
}
