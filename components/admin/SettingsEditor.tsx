'use client';

import type { SiteData } from '@/lib/types';
import { useState } from 'react';

export function SettingsEditor({ initialData }: { initialData: SiteData }) {
  const [data, setData] = useState(initialData);
  const s = data.settings;

  async function save() {
    await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    alert('Збережено');
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const j = await res.json();
    return j.url || '';
  }

  return (
    <div className="admin-form">
      <button type="button" className="admin-btn" onClick={save} style={{ marginBottom: 16 }}>Зберегти</button>
      <div className="admin-card">
        <label>Логотип (URL)<input value={s.logo} onChange={(e) => setData({ ...data, settings: { ...s, logo: e.target.value } })} /></label>
        <label>Завантажити логотип <input type="file" accept="image/*" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const url = await uploadImage(f); if (url) setData({ ...data, settings: { ...s, logo: url } });
        }} /></label>

        <label>Favicon (URL)<input value={s.favicon} onChange={(e) => setData({ ...data, settings: { ...s, favicon: e.target.value } })} /></label>
        <label>Завантажити favicon <input type="file" accept="image/*" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const url = await uploadImage(f); if (url) setData({ ...data, settings: { ...s, favicon: url } });
        }} /></label>

        <label>Години роботи<input value={s.hours} onChange={(e) => setData({ ...data, settings: { ...s, hours: e.target.value } })} /></label>
        <label>Адреса<input value={s.address} onChange={(e) => setData({ ...data, settings: { ...s, address: e.target.value } })} /></label>
        <label>Email<input value={s.email} onChange={(e) => setData({ ...data, settings: { ...s, email: e.target.value } })} /></label>
        <label>Телефон (шапка) — відображення<input value={s.headerPhone.display} onChange={(e) => setData({ ...data, settings: { ...s, headerPhone: { ...s.headerPhone, display: e.target.value } } })} /></label>
        <label>Телефон (шапка) — tel:<input value={s.headerPhone.tel} onChange={(e) => setData({ ...data, settings: { ...s, headerPhone: { ...s.headerPhone, tel: e.target.value } } })} /></label>
        <label>Copyright<input value={s.copyright} onChange={(e) => setData({ ...data, settings: { ...s, copyright: e.target.value } })} /></label>
      </div>
    </div>
  );
}