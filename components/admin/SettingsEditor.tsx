'use client';

import type { SiteData } from '@/lib/types';
import { saveSiteData } from '@/lib/admin/saveSite';
import { uploadImage } from '@/lib/admin/uploadImage';
import { useState } from 'react';
import { showToast } from './AdminToast';

export function SettingsEditor({ initialData }: { initialData: SiteData }) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const s = data.settings;

  function patchSettings(patch: Partial<typeof s>) {
    setData({ ...data, settings: { ...s, ...patch } });
    setDirty(true);
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

  async function onUpload(file: File, field: 'logo' | 'favicon') {
    const { url, error } = await uploadImage(file);
    if (!url) {
      showToast(error || 'Помилка завантаження', 'error');
      return;
    }
    patchSettings({ [field]: url });
  }

  return (
    <div className='admin-form'>
      <div className='admin-toolbar'>
        <button type='button' className='admin-btn' onClick={save} disabled={saving}>
          {saving ? 'Збереження…' : 'Зберегти'}
        </button>
        {dirty ? <span className='admin-dirty'>Є незбережені зміни</span> : null}
      </div>
      <div className='admin-card'>
        <label>
          Логотип (URL)
          <input value={s.logo} onChange={(e) => patchSettings({ logo: e.target.value })} />
        </label>
        <label>
          Завантажити логотип
          <input
            type='file'
            accept='image/*'
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await onUpload(f, 'logo');
            }}
          />
        </label>

        <label>
          Favicon (URL)
          <input value={s.favicon} onChange={(e) => patchSettings({ favicon: e.target.value })} />
        </label>
        <label>
          Завантажити favicon
          <input
            type='file'
            accept='image/*'
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await onUpload(f, 'favicon');
            }}
          />
        </label>

        <label>
          Години роботи
          <input value={s.hours} onChange={(e) => patchSettings({ hours: e.target.value })} />
        </label>
        <label>
          Адреса
          <input value={s.address} onChange={(e) => patchSettings({ address: e.target.value })} />
        </label>
        <label>
          Email
          <input value={s.email} onChange={(e) => patchSettings({ email: e.target.value })} />
        </label>
        <label>
          Телефон (шапка) — відображення
          <input
            value={s.headerPhone.display}
            onChange={(e) =>
              patchSettings({ headerPhone: { ...s.headerPhone, display: e.target.value } })
            }
          />
        </label>
        <label>
          Телефон (шапка) — tel:
          <input
            value={s.headerPhone.tel}
            onChange={(e) => patchSettings({ headerPhone: { ...s.headerPhone, tel: e.target.value } })}
          />
        </label>
        <label>
          Copyright
          <input value={s.copyright} onChange={(e) => patchSettings({ copyright: e.target.value })} />
        </label>
        <label>
          Посилання на відгуки (Google тощо)
          <input
            value={s.reviewsUrl || ''}
            onChange={(e) => patchSettings({ reviewsUrl: e.target.value })}
            placeholder='https://g.page/...'
          />
        </label>
      </div>
    </div>
  );
}
