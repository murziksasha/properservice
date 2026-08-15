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
  History,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  List,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { useAdminCounts } from './AdminCountsContext';
import { useAdminRole } from './AdminRoleContext';

const LINKS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: 'leads' | 'orders' | 'inbox';
}> = [
  { href: '/admin', label: 'Огляд', icon: LayoutDashboard, exact: true },
  { href: '/admin/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' },
  { href: '/admin/leads', label: 'Заявки', icon: ClipboardList, badge: 'leads' },
  { href: '/admin/orders', label: 'Замовлення', icon: ShoppingCart, badge: 'orders' },
  { href: '/admin/clients', label: 'Клієнти', icon: Users },
  { href: '/admin/menu', label: 'Меню', icon: List },
  { href: '/admin/pages', label: 'Сторінки', icon: FileText },
  { href: '/admin/goods', label: 'Товари', icon: Box },
  { href: '/admin/media', label: 'Медіатека', icon: ImageIcon },
  { href: '/admin/activity', label: 'Активність', icon: History },
  { href: '/admin/ops', label: 'Ops', icon: LifeBuoy },
  { href: '/admin/settings', label: 'Налаштування', icon: Settings },
];

type AdminNavProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  compact?: boolean;
  onToggleDensity?: () => void;
};

export function AdminNav({
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
  compact,
  onToggleDensity,
}: AdminNavProps) {
  const pathname = usePathname();
  const counts = useAdminCounts();
  const { canNav, username, role } = useAdminRole();
  const live = counts.live;

  useEffect(() => {
    onCloseMobile();
  }, [pathname, onCloseMobile]);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function badgeFor(kind?: 'leads' | 'orders' | 'inbox'): number {
    if (kind === 'leads') return counts.openLeads;
    if (kind === 'orders') return counts.openOrders;
    if (kind === 'inbox') return counts.openTotal;
    return 0;
  }

  return (
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
        {LINKS.filter((link) => canNav(link.href)).map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href, link.exact);
          const n = badgeFor(link.badge);
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
              {n > 0 ? (
                <span
                  className={`admin-nav-badge${live && link.badge === 'inbox' ? ' is-live' : ''}`}
                  aria-label={`${n} відкритих`}
                >
                  {n > 99 ? '99+' : n}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className='admin-nav-footer'>
        <div className='admin-nav-user' title={`${username} (${role})`}>
          <span className='admin-nav-icon' aria-hidden style={{ fontSize: 11, width: 20, textAlign: 'center' }}>
            ●
          </span>
          <span className='admin-nav-label'>
            {username}
            <span className='admin-nav-role'> · {role}</span>
          </span>
        </div>
        {onToggleDensity ? (
          <button
            type='button'
            className='admin-nav-site'
            title={compact ? 'Звичайна щільність' : 'Компактний режим'}
            onClick={onToggleDensity}
          >
            <span className='admin-nav-icon' aria-hidden style={{ fontSize: 12, width: 20, textAlign: 'center' }}>
              ≡
            </span>
            <span className='admin-nav-label'>{compact ? 'Компакт: ON' : 'Компакт: OFF'}</span>
          </button>
        ) : null}
        <button
          type='button'
          className='admin-nav-site'
          title='Ctrl+K'
          onClick={() => {
            window.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
            );
          }}
        >
          <span className='admin-nav-icon' aria-hidden style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
            ⌘
          </span>
          <span className='admin-nav-label'>Пошук · Ctrl+K</span>
        </button>
        <button
          type='button'
          className='admin-nav-site'
          title='Гарячі клавіші'
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
          }}
        >
          <span className='admin-nav-icon' aria-hidden style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
            ?
          </span>
          <span className='admin-nav-label'>Клавіші</span>
        </button>
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
  );
}
