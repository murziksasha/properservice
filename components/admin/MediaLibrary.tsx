'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadImage } from '@/lib/admin/uploadImage';
import { parseRetryAfterSeconds, rateLimitMessage } from '@/lib/admin/rateLimitUi';
import {
  IMAGE_PRESETS,
  IMAGE_PRESET_IDS,
  type ImagePresetId,
} from '@/lib/image-presets';
import {
  MEDIA_PURPOSE_IDS,
  MEDIA_PURPOSES,
  purposeFromPreset,
  type MediaPurpose,
} from '@/lib/media-purpose';
import { showToast } from './AdminToast';

interface MediaItem {
  name: string;
  url: string;
  size: number;
  mtime: string;
  purpose: MediaPurpose;
  tags: string[];
  alt?: string;
  width?: number;
  height?: number;
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
  const [purpose, setPurpose] = useState<MediaPurpose | 'all'>('all');
  const [uploading, setUploading] = useState(false);
  const [preset, setPreset] = useState<ImagePresetId>('default');
  const [uploadPurpose, setUploadPurpose] = useState<MediaPurpose>('other');
  const [tagsInput, setTagsInput] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editPurpose, setEditPurpose] = useState<MediaPurpose>('other');
  const [editTags, setEditTags] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (purpose !== 'all') params.set('purpose', purpose);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
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
  }, [purpose, q]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    setUploadPurpose(purposeFromPreset(preset));
  }, [preset]);

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const { url, error, width, height } = await uploadImage(file, {
        preset,
        purpose: uploadPurpose,
        tags: tagsInput,
      });
      if (!url) {
        showToast(error || 'Помилка upload', 'error');
        return;
      }
      const dim = width && height ? ` · ${width}×${height}` : '';
      const fmt = url.endsWith('.webp')
        ? 'JPEG → WebP'
        : url.endsWith('.png')
          ? 'PNG'
          : 'OK';
      showToast(`Завантажено (${fmt}${dim})`, 'success');
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

  function startEdit(item: MediaItem) {
    setEditing(item.name);
    setEditPurpose(item.purpose || 'other');
    setEditTags((item.tags || []).join(', '));
  }

  async function saveEdit(name: string) {
    try {
      const res = await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          purpose: editPurpose,
          tags: editTags,
        }),
      });
      if (!res.ok) {
        showToast('Не вдалося зберегти метадані', 'error');
        return;
      }
      showToast('Збережено', 'success');
      setEditing(null);
      await load();
    } catch {
      showToast('Мережева помилка', 'error');
    }
  }

  const totalBytes = items.reduce((s, i) => s + i.size, 0);

  return (
    <div className='admin-card admin-form'>
      <div className='admin-row admin-row--between admin-mb'>
        <h2 className='admin-h2' style={{ margin: 0 }}>
          Файли
        </h2>
        <span className='admin-hint' style={{ margin: 0 }}>
          {items.length} файлів · {formatBytes(totalBytes)}
        </span>
      </div>

      <div className='admin-media-chips admin-mb' role='tablist' aria-label='Групи зображень'>
        <button
          type='button'
          role='tab'
          className={`admin-chip${purpose === 'all' ? ' admin-chip--active' : ''}`}
          aria-selected={purpose === 'all'}
          onClick={() => setPurpose('all')}
        >
          Усі
        </button>
        {MEDIA_PURPOSE_IDS.map((id) => (
          <button
            key={id}
            type='button'
            role='tab'
            className={`admin-chip${purpose === id ? ' admin-chip--active' : ''}`}
            aria-selected={purpose === id}
            title={MEDIA_PURPOSES[id].description}
            onClick={() => setPurpose(id)}
          >
            {MEDIA_PURPOSES[id].label}
          </button>
        ))}
      </div>

      <div className='admin-toolbar admin-mb'>
        <label className='admin-inline-label'>
          Розмір
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as ImagePresetId)}
            disabled={uploading}
            aria-label='Пресет розміру зображення'
            title={IMAGE_PRESETS[preset].description}
          >
            {IMAGE_PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {IMAGE_PRESETS[id].label} — {IMAGE_PRESETS[id].description}
              </option>
            ))}
          </select>
        </label>
        <label className='admin-inline-label'>
          Група
          <select
            value={uploadPurpose}
            onChange={(e) => setUploadPurpose(e.target.value as MediaPurpose)}
            disabled={uploading}
            aria-label='Група для нового файлу'
          >
            {MEDIA_PURPOSE_IDS.map((id) => (
              <option key={id} value={id}>
                {MEDIA_PURPOSES[id].label}
              </option>
            ))}
          </select>
        </label>
        <label className='admin-inline-label admin-grow'>
          Теги
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder='tv, coffee…'
            disabled={uploading}
          />
        </label>
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
      </div>

      <div className='admin-toolbar admin-mb'>
        <input
          type='search'
          className='admin-grow'
          placeholder='Пошук за назвою / тегами…'
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label='Пошук медіа'
        />
        <button type='button' className='admin-btn admin-btn--secondary' onClick={() => void load()}>
          Оновити
        </button>
      </div>

      {loading ? <p className='admin-hint'>Завантаження…</p> : null}
      {!loading && items.length === 0 ? <p className='admin-hint'>Немає файлів.</p> : null}

      <div className='admin-media-grid'>
        {items.map((item) => (
          <div key={item.name} className='admin-media-card'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.alt || item.name} loading='lazy' />
            <div className='admin-media-meta'>
              <span title={item.name}>{item.name}</span>
              <span>
                {MEDIA_PURPOSES[item.purpose]?.label || item.purpose} · {formatBytes(item.size)}
              </span>
              {item.tags?.length ? <span className='admin-media-tags'>{item.tags.join(', ')}</span> : null}
            </div>

            {editing === item.name ? (
              <div className='admin-media-edit'>
                <label className='admin-inline-label'>
                  Група
                  <select
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value as MediaPurpose)}
                  >
                    {MEDIA_PURPOSE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {MEDIA_PURPOSES[id].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='admin-inline-label'>
                  Теги
                  <input value={editTags} onChange={(e) => setEditTags(e.target.value)} />
                </label>
                <div className='admin-row'>
                  <button type='button' className='admin-btn' onClick={() => void saveEdit(item.name)}>
                    OK
                  </button>
                  <button
                    type='button'
                    className='admin-btn admin-btn--secondary'
                    onClick={() => setEditing(null)}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            ) : (
              <div className='admin-row'>
                <button
                  type='button'
                  className='admin-btn admin-btn--secondary'
                  onClick={() => void copyUrl(item.url)}
                >
                  URL
                </button>
                <button
                  type='button'
                  className='admin-btn admin-btn--secondary'
                  onClick={() => startEdit(item)}
                >
                  Група
                </button>
                <button
                  type='button'
                  className='admin-btn admin-btn--danger'
                  onClick={() => void remove(item.name)}
                >
                  Видалити
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
