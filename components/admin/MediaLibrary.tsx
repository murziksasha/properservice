'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadImage } from '@/lib/admin/uploadImage';
import { parseRetryAfterSeconds, rateLimitMessage } from '@/lib/admin/rateLimitUi';
import { showToast } from './AdminToast';

interface MediaItem {
  name: string;
  url: string;
  size: number;
  mtime: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/media');
      if (!res.ok) {
        showToast('Не вдалося завантажити медіа', 'error');
        return;
      }
      const json = (await res.json()) as { items?: MediaItem[] };
      setItems(json.items || []);
    } catch {
      showToast('Мережева помилка', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const { url, error } = await uploadImage(file);
      if (!url) {
        showToast(error || 'Помилка upload', 'error');
        return;
      }
      showToast(url.endsWith('.webp') ? 'Завантажено (оптимізовано WebP)' : 'Завантажено', 'success');
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast('URL скопійовано', 'success');
    } catch {
      showToast(url, 'info');
    }
  }

  async function remove(name: string) {
    if (!confirm(`Видалити ${name}? Посилання на сторінках можуть зламатися.`)) return;
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          const sec = parseRetryAfterSeconds(res, 60);
          showToast(rateLimitMessage(sec, 'upload'), 'error');
          return;
        }
        showToast('Не вдалося видалити', 'error');
        return;
      }
      showToast('Видалено', 'success');
      await load();
    } catch {
      showToast('Мережева помилка', 'error');
    }
  }

  const filtered = items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));
  const totalBytes = items.reduce((s, i) => s + i.size, 0);

  return (
    <div className='admin-card'>
      <div className='admin-row admin-row--between admin-mb'>
        <h2 className='admin-h2' style={{ margin: 0 }}>
          Медіатека
        </h2>
        <span className='admin-hint' style={{ margin: 0 }}>
          {items.length} файлів · {formatBytes(totalBytes)}
        </span>
      </div>

      <div className='admin-row admin-mb'>
        <label className='admin-btn' style={{ cursor: uploading ? 'wait' : 'pointer' }}>
          {uploading ? 'Завантаження…' : 'Завантажити зображення'}
          <input
            ref={fileRef}
            type='file'
            accept='image/jpeg,image/png,image/webp,image/gif'
            hidden
            disabled={uploading}
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
          />
        </label>
        <input
          type='search'
          className='admin-grow'
          placeholder='Пошук за назвою…'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label='Пошук медіа'
        />
        <button type='button' className='admin-btn admin-btn--secondary' onClick={() => void load()}>
          Оновити
        </button>
      </div>

      {loading ? <p className='admin-hint'>Завантаження…</p> : null}
      {!loading && filtered.length === 0 ? <p className='admin-hint'>Немає файлів.</p> : null}

      <div className='admin-media-grid'>
        {filtered.map((item) => (
          <div key={item.name} className='admin-media-card'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.name} loading='lazy' />
            <div className='admin-media-meta'>
              <span title={item.name}>{item.name}</span>
              <span>{formatBytes(item.size)}</span>
            </div>
            <div className='admin-row'>
              <button type='button' className='admin-btn admin-btn--secondary' onClick={() => void copyUrl(item.url)}>
                Копіювати URL
              </button>
              <button type='button' className='admin-btn admin-btn--danger' onClick={() => void remove(item.name)}>
                Видалити
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
