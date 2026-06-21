'use client';

import type { SiteData } from '@/lib/types';
import { useState } from 'react';

interface SiteEditorProps {
  initialData: SiteData;
  children: (data: SiteData, setData: (d: SiteData) => void) => React.ReactNode;
}

export function SiteEditor({ initialData, children }: SiteEditorProps) {
  const [data, setData] = useState(initialData);

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
      <div className="admin-row" style={{ marginBottom: 16 }}>
        <button type="button" className="admin-btn" onClick={save}>Зберегти зміни</button>
      </div>
      {children(data, setData)}
    </div>
  );
}