'use client';

import type { SiteData } from '@/lib/types';
import { saveSiteData } from '@/lib/admin/saveSite';
import { useState } from 'react';
import { showToast } from './AdminToast';

export function SaveSiteButton({ data }: { data: SiteData }) {
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await saveSiteData(data);
    setSaving(false);
    if (result.ok) showToast('Збережено', 'success');
    else showToast(result.error, 'error');
  }

  return (
    <div className='admin-row'>
      <button type='button' className='admin-btn' onClick={save} disabled={saving}>
        {saving ? 'Збереження…' : 'Зберегти'}
      </button>
    </div>
  );
}
