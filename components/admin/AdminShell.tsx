'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminNav } from './AdminNav';
import { AdminToastHost } from './AdminToast';

const STORAGE_KEY = 'admin-nav-collapsed';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((v) => !v);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className='admin-body'>
      <div
        className={`admin-shell${collapsed && hydrated ? ' admin-shell--nav-collapsed' : ''}${
          mobileOpen ? ' admin-shell--nav-open' : ''
        }`}
      >
        <AdminNav
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onToggleMobile={toggleMobile}
          onCloseMobile={closeMobile}
        />
        <main className='admin-main'>{children}</main>
      </div>
      <AdminToastHost />
    </div>
  );
}
