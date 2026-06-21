'use client';

import type { SiteData } from '@/lib/types';
import { useState } from 'react';

export function SaveSiteButton({ data }: { data: SiteData }) {
  const [status, setStatus] = useState('');

  async function save() {
    setStatus('Збереження...');
    const res = await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setStatus(res.ok ? 'Збережено!' : 'Помилка');
    setTimeout(() => setStatus(''), 2000);
  }

  return (
    <div className="admin-row">
      <button type="button" className="admin-btn" onClick={save}>Зберегти</button>
      {status ? <span>{status}</span> : null}
    </div>
  );
}