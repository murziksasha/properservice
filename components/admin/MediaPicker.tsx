'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadImage } from '@/lib/admin/uploadImage';
import {
  MEDIA_PURPOSE_IDS,
  MEDIA_PURPOSES,
  purposeFromPreset,
  type MediaPurpose,
} from '@/lib/media-purpose';
import type { ImagePresetId } from '@/lib/image-presets';
import { showToast } from './AdminToast';

export type MediaPickerItem = {
  name: string;
  url: string;
  size: number;
  mtime: string;
  purpose: MediaPurpose;
  tags: string[];
  alt?: string;
  width?: number;
  height?: number;
};

type MediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaPickerItem) => void;
  /** Pre-filter + default upload purpose */
  purpose?: MediaPurpose | 'all';
  preset?: ImagePresetId | string;
};

export function MediaPicker({
  open,
  onClose,
  onSelect,
  purpose: purposeProp = 'all',
  preset,
}: MediaPickerProps) {
  const defaultPurpose: MediaPurpose | 'all' =
    purposeProp !== 'all'
      ? purposeProp
      : preset
        ? purposeFromPreset(String(preset))
        : 'all';

  const [items, setItems] = useState<MediaPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [purpose, setPurpose] = useState<MediaPurpose | 'all'>(defaultPurpose);
  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPurpose(defaultPurpose);
      setQ('');
    }
  }, [open, defaultPurpose]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (purpose && purpose !== 'all') params.set('purpose', purpose);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
      if (!res.ok) {
        showToast('Не вдалося завантажити медіа', 'error');
        return;
      }
      const json = (await res.json()) as { items?: MediaPickerItem[] };
      setItems(json.items || []);
    } catch {
      showToast('Мережева помилка', 'error');
    } finally {
      setLoading(false);
    }
  }, [purpose, q]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const uploadPurpose: MediaPurpose =
        purpose !== 'all' ? purpose : purposeFromPreset(preset ? String(preset) : undefined);
      const { url, error } = await uploadImage(file, {
        preset,
        purpose: uploadPurpose,
      });
      if (!url) {
        showToast(error || 'Помилка upload', 'error');
        return;
      }
      showToast('Завантажено', 'success');
      await load();
      onSelect({
        name: url.split('/').pop() || '',
        url,
        size: 0,
        mtime: new Date().toISOString(),
        purpose: uploadPurpose,
        tags: [],
      });
      onClose();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (!open) return null;

  return (
    <div className='admin-modal-backdrop' role='presentation' onClick={onClose}>
      <div
        className='admin-modal admin-modal--wide'
        role='dialog'
        aria-modal='true'
        aria-label='Вибір зображення'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='admin-modal__head'>
          <h2 className='admin-h2' style={{ margin: 0 }}>
            Медіатека
          </h2>
          <button type='button' className='admin-btn admin-btn--secondary' onClick={onClose}>
            Закрити
          </button>
        </div>

        <div className='admin-toolbar admin-mb'>
          <label className='admin-inline-label'>
            Група
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as MediaPurpose | 'all')}
              aria-label='Група зображень'
            >
              <option value='all'>Усі</option>
              {MEDIA_PURPOSE_IDS.map((id) => (
                <option key={id} value={id}>
                  {MEDIA_PURPOSES[id].label}
                </option>
              ))}
            </select>
          </label>
          <input
            type='search'
            className='admin-grow'
            placeholder='Пошук…'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label='Пошук медіа'
          />
          <button type='button' className='admin-btn admin-btn--secondary' onClick={() => void load()}>
            Оновити
          </button>
          <label className='admin-btn' style={{ cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? 'Завантаження…' : 'Завантажити нове'}
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

        {loading ? <p className='admin-hint'>Завантаження…</p> : null}
        {!loading && items.length === 0 ? <p className='admin-hint'>Немає файлів у цій групі.</p> : null}

        <div className='admin-media-grid admin-media-grid--picker'>
          {items.map((item) => (
            <button
              key={item.name}
              type='button'
              className='admin-media-card admin-media-card--pick'
              onClick={() => {
                onSelect(item);
                onClose();
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.alt || item.name} loading='lazy' />
              <div className='admin-media-meta'>
                <span title={item.name}>{item.name}</span>
                <span>{MEDIA_PURPOSES[item.purpose]?.label || item.purpose}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
