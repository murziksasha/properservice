'use client';
import { useState, useEffect } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import Link from 'next/link';
import type { SiteData, Page } from '@/lib/types';

export default function AdminPagesList() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');

  async function load() {
    const res = await fetch('/api/site');
    if (res.ok) setSite(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    const res = await fetch('/api/site');
    if (res.ok) setSite(await res.json());
  }

  async function addPage() {
    if (!newTitle || !site) return alert('Введіть назву сторінки');
    const base = (newSlug || newTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')).trim() || 'new-page';
    let slug = base;
    let i = 1;
    while (site.pages.some((p) => p.slug === slug)) slug = `${base}-${i++}`;

    const newPage: Page = {
      id: Math.random().toString(36).slice(2, 10),
      slug,
      title: newTitle,
      description: newTitle,
      visible: true,
      sections: [
        { id: 'nav', type: 'services-nav', visible: true } as any,
        { id: 'hero', type: 'hero', visible: true, titleHtml: newTitle, aboutLines: [''], callbackTitle: 'Залиште заявку', callbackButtonText: 'Надіслати', callbackPlaceholder: '+38( ___ ) __ __ ___', image: '/img/services/technika_img.png', imageAlt: 'img' } as any,
        { id: 'adv', type: 'advantages', visible: true, items: [] } as any,
        { id: 'cb', type: 'callback', visible: true, title: 'Залиште заявку', buttonText: 'Надіслати', placeholder: '+38( ___ ) __ __ ___' } as any,
        { id: 'ct', type: 'contacts', visible: true, title: 'Контакти', inviteText: '', addressHtml: '', phones: [], email: site.settings?.email || '', social: [], mapEmbedUrl: site.settings?.mapEmbedUrl || '' } as any,
      ],
    };

    const res = await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...site, pages: [...site.pages, newPage] }),
    });
    if (res.ok) {
      setNewTitle(''); setNewSlug('');
      await refresh();
    } else alert('Помилка створення сторінки');
  }

  async function deletePage(id: string, slug: string) {
    if (!site || slug === '' || !confirm('Видалити сторінку?')) return;
    const res = await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...site, pages: site.pages.filter((p) => p.id !== id) }),
    });
    if (res.ok) await refresh();
    else alert('Помилка видалення (головну сторінку не можна видаляти)');
  }

  if (loading || !site) {
    return <AdminShell><h1>Сторінки</h1><p>Завантаження...</p></AdminShell>;
  }

  return (
    <AdminShell>
      <h1>Сторінки</h1>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div className="admin-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Назва нової сторінки" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <input placeholder="slug (опціонально)" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} style={{ width: 160 }} />
          <button type="button" className="admin-btn" onClick={addPage}>+ Додати сторінку</button>
        </div>
        <small style={{ color: '#666' }}>Створена сторінка матиме базові секції. Використовуйте Конструктор для редагування тексту, зображень та розміру заголовків.</small>
      </div>

      <div className="admin-card">
        {site.pages.map((page) => (
          <div key={page.id} className="admin-row" style={{ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' }}>
            <span>
              {page.title || page.slug || 'Головна'}
              {!page.visible ? ' (приховано)' : ''}
              {page.slug === '' ? ' — головна' : ''}
            </span>
            <div className="admin-row">
              <Link href={`/admin/pages/${page.slug || 'home'}`} className="admin-btn admin-btn--secondary">Конструктор</Link>
              {page.slug !== '' && (
                <button type="button" className="admin-btn admin-btn--danger" onClick={() => deletePage(page.id, page.slug)}>× Видалити</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
