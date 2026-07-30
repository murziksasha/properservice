'use client';

import { useState, useEffect } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { showToast } from '@/components/admin/AdminToast';
import { fetchSiteData, saveSiteData } from '@/lib/admin/saveSite';
import { createId } from '@/lib/id';
import { createDefaultPage } from '@/lib/section-factory';
import Link from 'next/link';
import type { Page, SiteData } from '@/lib/types';

export default function AdminPagesList() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(false);
    const data = await fetchSiteData();
    if (data) {
      setSite(data);
      setLoadError(false);
    } else {
      setSite(null);
      setLoadError(true);
      showToast('Не вдалося завантажити дані (потрібна авторизація)', 'error');
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function persist(next: SiteData, okMsg: string) {
    setBusy(true);
    const result = await saveSiteData(next);
    setBusy(false);
    if (result.ok) {
      setSite({ ...next, updatedAt: result.updatedAt || next.updatedAt });
      showToast(okMsg, 'success');
      return true;
    }
    showToast(result.error, 'error');
    return false;
  }

  async function addPage() {
    if (!newTitle || !site) {
      showToast('Введіть назву сторінки', 'error');
      return;
    }
    const base =
      (newSlug || newTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')).trim() || 'new-page';
    let slug = base;
    let i = 1;
    while (site.pages.some((p) => p.slug === slug)) slug = `${base}-${i++}`;

    const newPage = createDefaultPage({
      title: newTitle,
      slug,
      email: site.settings?.email || '',
      mapEmbedUrl: site.settings?.mapEmbedUrl || '',
    });

    const next = { ...site, pages: [...site.pages, newPage] };
    if (await persist(next, 'Сторінку створено')) {
      setNewTitle('');
      setNewSlug('');
    }
  }

  async function deletePage(id: string, slug: string) {
    if (!site || slug === '' || !confirm('Видалити сторінку?')) return;
    await persist(
      { ...site, pages: site.pages.filter((p) => p.id !== id) },
      'Сторінку видалено',
    );
  }

  async function toggleVisible(page: Page) {
    if (!site) return;
    const pages = site.pages.map((p) => (p.id === page.id ? { ...p, visible: !p.visible } : p));
    await persist({ ...site, pages }, page.visible ? 'Сторінку приховано' : 'Сторінку опубліковано');
  }

  async function duplicatePage(page: Page) {
    if (!site) return;
    let slug = page.slug ? `${page.slug}-copy` : 'copy';
    let n = 1;
    while (site.pages.some((p) => p.slug === slug)) slug = `${page.slug || 'page'}-copy-${n++}`;

    const copy: Page = {
      ...structuredClone(page),
      id: createId(),
      slug,
      title: `${page.title || page.slug || 'Сторінка'} (копія)`,
      visible: false,
      sections: page.sections.map((s) => ({ ...structuredClone(s), id: createId() })),
    };

    await persist({ ...site, pages: [...site.pages, copy] }, 'Сторінку продубльовано (прихована)');
  }

  if (loading) {
    return (
      <AdminShell>
        <h1>Сторінки</h1>
        <p className='admin-hint'>Завантаження...</p>
      </AdminShell>
    );
  }

  if (loadError || !site) {
    return (
      <AdminShell>
        <h1>Сторінки</h1>
        <div className='admin-card'>
          <p className='admin-hint admin-login-error'>Не вдалося завантажити список сторінок.</p>
          <button type='button' className='admin-btn' onClick={() => void load()}>
            Спробувати знову
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1>Сторінки</h1>
      <p className='admin-hint admin-mb-lg'>
        Список сторінок сайту. Відкрийте конструктор, щоб редагувати секції та контент.
      </p>

      <div className='admin-card admin-form admin-mb-lg'>
        <h2 className='admin-h2'>Нова сторінка</h2>
        <div className='admin-row admin-row--wrap'>
          <input
            className='admin-grow'
            placeholder='Назва нової сторінки'
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={busy}
          />
          <input
            className='admin-field-sm'
            placeholder='slug (опціонально)'
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            disabled={busy}
          />
          <button type='button' className='admin-btn' onClick={() => void addPage()} disabled={busy}>
            + Додати сторінку
          </button>
        </div>
        <small className='admin-hint'>
          Створена сторінка матиме базові секції. Конструктор: редагування, DnD, Preview, дублювання секцій.
        </small>
      </div>

      <div className='admin-card'>
        {site.pages.map((page) => {
          const publicPath = page.slug ? `/${page.slug}` : '/';
          return (
            <div key={page.id} className='admin-page-row'>
              <div className='admin-page-row__meta'>
                <strong>
                  {page.title || page.slug || 'Головна'}
                  {page.slug === '' ? ' — головна' : ''}
                </strong>
                <span className='admin-hint'>
                  {publicPath}
                  {!page.visible ? ' · прихована' : ''}
                  {page.contentHtml?.trim() ? ' · HTML-режим' : ''}
                  {' · '}
                  {page.sections.length} секц.
                </span>
              </div>
              <div className='admin-row admin-row--wrap'>
                <label className='admin-check'>
                  <input
                    type='checkbox'
                    checked={page.visible}
                    disabled={busy}
                    onChange={() => void toggleVisible(page)}
                  />
                  видима
                </label>
                <Link href={`/admin/pages/${page.slug || 'home'}`} className='admin-btn admin-btn--secondary'>
                  Конструктор
                </Link>
                <a href={publicPath} target='_blank' rel='noreferrer' className='admin-btn admin-btn--secondary'>
                  ↗
                </a>
                <button
                  type='button'
                  className='admin-btn admin-btn--secondary'
                  disabled={busy}
                  onClick={() => void duplicatePage(page)}
                >
                  ⧉
                </button>
                {page.slug !== '' ? (
                  <button
                    type='button'
                    className='admin-btn admin-btn--danger'
                    disabled={busy}
                    onClick={() => void deletePage(page.id, page.slug)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
