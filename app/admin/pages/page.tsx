'use client';

import { useState, useEffect } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { showToast } from '@/components/admin/AdminToast';
import { fetchSiteData, saveSiteData } from '@/lib/admin/saveSite';
import { createDefaultPage } from '@/lib/section-factory';
import Link from 'next/link';
import type { SiteData } from '@/lib/types';

export default function AdminPagesList() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');

  async function load() {
    const data = await fetchSiteData();
    if (data) setSite(data);
    else showToast('Не вдалося завантажити дані (потрібна авторизація)', 'error');
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
    const result = await saveSiteData(next);
    if (result.ok) {
      setNewTitle('');
      setNewSlug('');
      setSite(next);
      showToast('Сторінку створено', 'success');
    } else {
      showToast(result.error, 'error');
    }
  }

  async function deletePage(id: string, slug: string) {
    if (!site || slug === '' || !confirm('Видалити сторінку?')) return;
    const next = { ...site, pages: site.pages.filter((p) => p.id !== id) };
    const result = await saveSiteData(next);
    if (result.ok) {
      setSite(next);
      showToast('Сторінку видалено', 'success');
    } else {
      showToast(result.error || 'Помилка видалення', 'error');
    }
  }

  if (loading || !site) {
    return (
      <AdminShell>
        <h1>Сторінки</h1>
        <p>Завантаження...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1>Сторінки</h1>

      <div className='admin-card admin-mb-lg'>
        <div className='admin-row admin-row--wrap'>
          <input
            placeholder='Назва нової сторінки'
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            className='admin-field-sm'
            placeholder='slug (опціонально)'
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
          />
          <button type='button' className='admin-btn' onClick={addPage}>
            + Додати сторінку
          </button>
        </div>
        <small className='admin-hint'>
          Створена сторінка матиме базові секції. Використовуйте Конструктор для редагування тексту, зображень та
          розміру заголовків.
        </small>
      </div>

      <div className='admin-card'>
        {site.pages.map((page) => (
          <div key={page.id} className='admin-row admin-row--between admin-mb admin-row--wrap'>
            <span>
              {page.title || page.slug || 'Головна'}
              {!page.visible ? ' (приховано)' : ''}
              {page.slug === '' ? ' — головна' : ''}
            </span>
            <div className='admin-row'>
              <Link href={`/admin/pages/${page.slug || 'home'}`} className='admin-btn admin-btn--secondary'>
                Конструктор
              </Link>
              {page.slug !== '' && (
                <button
                  type='button'
                  className='admin-btn admin-btn--danger'
                  onClick={() => deletePage(page.id, page.slug)}
                >
                  × Видалити
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
