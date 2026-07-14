'use client';

import type { SiteData } from '@/lib/types';
import { saveSiteData } from '@/lib/admin/saveSite';
import { useSaveShortcut, useUnsavedGuard } from '@/lib/admin/useUnsavedGuard';
import { useCallback, useState } from 'react';
import { showToast } from './AdminToast';

interface SiteEditorProps {
  initialData: SiteData;
  children: (data: SiteData, setData: (d: SiteData) => void, markDirty: () => void) => React.ReactNode;
}

export function SiteEditor({ initialData, children }: SiteEditorProps) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useUnsavedGuard(dirty);

  const save = useCallback(async () => {
    setSaving(true);
    const result = await saveSiteData(data);
    setSaving(false);
    if (result.ok) {
      setDirty(false);
      showToast('Збережено', 'success');
    } else {
      showToast(result.error, 'error');
    }
  }, [data]);

  useSaveShortcut(save, { dirty, enabled: !saving });

  function updateData(next: SiteData) {
    setData(next);
    setDirty(true);
  }

  return (
    <div>
      <div className='admin-toolbar'>
        <button type='button' className='admin-btn' onClick={() => void save()} disabled={saving}>
          {saving ? 'Збереження…' : 'Зберегти зміни'}
        </button>
        {dirty ? <span className='admin-dirty'>Є незбережені зміни · Ctrl+S</span> : null}
      </div>
      {children(data, updateData, () => setDirty(true))}
    </div>
  );
}
