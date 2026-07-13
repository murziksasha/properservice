'use client';

import type { SiteData } from '@/lib/types';
import { saveSiteData } from '@/lib/admin/saveSite';
import { useState } from 'react';
import { showToast } from './AdminToast';

interface SiteEditorProps {
  initialData: SiteData;
  children: (data: SiteData, setData: (d: SiteData) => void) => React.ReactNode;
}

export function SiteEditor({ initialData, children }: SiteEditorProps) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await saveSiteData(data);
    setSaving(false);
    if (result.ok) showToast('Збережено', 'success');
    else showToast(result.error, 'error');
  }

  return (
    <div>
      <div className='admin-toolbar'>
        <button type='button' className='admin-btn' onClick={save} disabled={saving}>
          {saving ? 'Збереження…' : 'Зберегти зміни'}
        </button>
      </div>
      {children(data, setData)}
    </div>
  );
}
