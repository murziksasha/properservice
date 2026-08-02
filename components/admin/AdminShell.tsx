'use client';

import { useCallback, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
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

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMobile();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, closeMobile]);

  return (
    <div className='admin-body'>
      {/* Fixed chrome outside the grid — never becomes an extra track that stretches the page. */}
      <button
        type='button'
        className='admin-nav-toggle admin-nav-toggle--mobile'
        aria-label={mobileOpen ? 'Закрити навігацію' : 'Відкрити навігацію'}
        aria-expanded={mobileOpen}
        onClick={toggleMobile}
      >
        {mobileOpen ? <X size={22} strokeWidth={2} aria-hidden /> : <Menu size={22} strokeWidth={2} aria-hidden />}
      </button>
      {mobileOpen ? (
        <button
          type='button'
          className='admin-nav-overlay'
          aria-label='Закрити'
          onClick={closeMobile}
        />
      ) : null}

      <div
        className={`admin-shell${collapsed && hydrated ? ' admin-shell--nav-collapsed' : ''}${
          mobileOpen ? ' admin-shell--nav-open' : ''
        }`}
      >
        <AdminNav
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={closeMobile}
        />
        <main className='admin-main'>{children}</main>
      </div>
      <AdminToastHost />
    </div>
  );
}
