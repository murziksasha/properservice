'use client';

import type { MenuItem, SiteData } from '@/lib/types';
import { useState } from 'react';

export function MenuEditor({ initialData }: { initialData: SiteData }) {
  const [data, setData] = useState(initialData);

  function updateHeader(index: number, patch: Partial<MenuItem>) {
    const headerMenu = [...data.headerMenu];
    headerMenu[index] = { ...headerMenu[index], ...patch };
    setData({ ...data, headerMenu });
  }

  async function save() {
    await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    alert('Збережено');
  }

  return (
    <div>
      <button type="button" className="admin-btn" onClick={save} style={{ marginBottom: 16 }}>Зберегти</button>

      <div className="admin-card">
        <h3>Шапка сайту</h3>
        {data.headerMenu.map((item, i) => (
          <div key={item.id} className="admin-section-item">
            <label>Назва<input value={item.label} onChange={(e) => updateHeader(i, { label: e.target.value })} /></label>
            <label>Посилання<input value={item.href} onChange={(e) => updateHeader(i, { href: e.target.value })} /></label>
            <label>
              <input type="checkbox" checked={item.visible} onChange={(e) => updateHeader(i, { visible: e.target.checked })} />
              {' '}Видимий
            </label>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <h3>Навігація послуг</h3>
        {data.servicesNav.map((item, i) => (
          <div key={item.id} className="admin-section-item">
            <label>Назва<input value={item.label} onChange={(e) => {
              const servicesNav = [...data.servicesNav];
              servicesNav[i] = { ...servicesNav[i], label: e.target.value };
              setData({ ...data, servicesNav });
            }} /></label>
            <label>Slug<input value={item.slug} onChange={(e) => {
              const servicesNav = [...data.servicesNav];
              servicesNav[i] = { ...servicesNav[i], slug: e.target.value, href: `/${e.target.value}` };
              setData({ ...data, servicesNav });
            }} /></label>
            <label>
              <input type="checkbox" checked={item.visible} onChange={(e) => {
                const servicesNav = [...data.servicesNav];
                servicesNav[i] = { ...servicesNav[i], visible: e.target.checked };
                setData({ ...data, servicesNav });
              }} />
              {' '}Видимий
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}