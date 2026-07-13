'use client';

import type { MenuItem, SiteData } from '@/lib/types';
import { saveSiteData } from '@/lib/admin/saveSite';
import { useState } from 'react';
import { showToast } from './AdminToast';

export function MenuEditor({ initialData }: { initialData: SiteData }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function mark(next: SiteData) {
    setData(next);
    setDirty(true);
  }

  function updateHeader(index: number, patch: Partial<MenuItem>) {
    const headerMenu = [...data.headerMenu];
    headerMenu[index] = { ...headerMenu[index], ...patch };
    mark({ ...data, headerMenu });
  }

  async function save() {
    setSaving(true);
    const result = await saveSiteData(data);
    setSaving(false);
    if (result.ok) {
      setDirty(false);
      showToast('Збережено', 'success');
    } else {
      showToast(result.error, 'error');
    }
  }

  return (
    <div>
      <div className='admin-toolbar'>
        <button type='button' className='admin-btn' onClick={save} disabled={saving}>
          {saving ? 'Збереження…' : 'Зберегти'}
        </button>
        {dirty ? <span className='admin-dirty'>Є незбережені зміни</span> : null}
      </div>

      <div className='admin-card'>
        <h3>Шапка сайту</h3>
        {data.headerMenu.map((item, i) => (
          <div key={item.id} className='admin-section-item admin-form'>
            <label>
              Назва
              <input value={item.label} onChange={(e) => updateHeader(i, { label: e.target.value })} />
            </label>
            <label>
              Посилання
              <input value={item.href} onChange={(e) => updateHeader(i, { href: e.target.value })} />
            </label>
            <label className='admin-check'>
              <input
                type='checkbox'
                checked={item.visible}
                onChange={(e) => updateHeader(i, { visible: e.target.checked })}
              />
              Видимий
            </label>
          </div>
        ))}
      </div>

      <div className='admin-card'>
        <h3>Навігація послуг</h3>
        {data.servicesNav.map((item, i) => (
          <div key={item.id} className='admin-section-item admin-form'>
            <label>
              Назва
              <input
                value={item.label}
                onChange={(e) => {
                  const servicesNav = [...data.servicesNav];
                  servicesNav[i] = { ...servicesNav[i], label: e.target.value };
                  mark({ ...data, servicesNav });
                }}
              />
            </label>
            <label>
              slug
              <input
                value={item.slug}
                onChange={(e) => {
                  const servicesNav = [...data.servicesNav];
                  servicesNav[i] = {
                    ...servicesNav[i],
                    slug: e.target.value,
                    href: `/${e.target.value}`,
                  };
                  mark({ ...data, servicesNav });
                }}
              />
            </label>
            <label className='admin-check'>
              <input
                type='checkbox'
                checked={item.visible}
                onChange={(e) => {
                  const servicesNav = [...data.servicesNav];
                  servicesNav[i] = { ...servicesNav[i], visible: e.target.checked };
                  mark({ ...data, servicesNav });
                }}
              />
              Видимий
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
