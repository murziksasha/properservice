'use client';

import { useState } from 'react';
import { uploadImage, type UploadImageOptions } from '@/lib/admin/uploadImage';
import type { ImagePresetId } from '@/lib/image-presets';
import { showToast } from './AdminToast';

interface ImageFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  /** Override default upload (uses uploadImage + toast). */
  onUpload?: (file: File) => Promise<string>;
  /** Resize preset for server optimize (product, logo, hero, …). */
  preset?: ImagePresetId | string;
  maxWidth?: number;
  maxHeight?: number;
  alt?: string;
  onAltChange?: (alt: string) => void;
  /** Show toast on success (default false — parent save is enough). */
  toastOnSuccess?: boolean;
}

/** URL + file upload + optional preview for admin editors. */
export function ImageField({
  label = 'Зображення',
  value,
  onChange,
  onUpload,
  preset,
  maxWidth,
  maxHeight,
  alt,
  onAltChange,
  toastOnSuccess = false,
}: ImageFieldProps) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      if (onUpload) {
        const url = await onUpload(file);
        if (url) onChange(url);
        return;
      }
      const opts: UploadImageOptions = {};
      if (preset) opts.preset = preset;
      if (maxWidth != null) opts.maxWidth = maxWidth;
      if (maxHeight != null) opts.maxHeight = maxHeight;

      const { url, error, width, height } = await uploadImage(file, opts);
      if (!url) {
        showToast(error || 'Помилка завантаження', 'error');
        return;
      }
      onChange(url);
      if (toastOnSuccess) {
        const dim = width && height ? ` (${width}×${height})` : '';
        showToast(`Завантажено${dim}`, 'success');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='admin-image-field'>
      <label>
        {label} (URL)
        <input value={value} onChange={(e) => onChange(e.target.value)} disabled={busy} />
      </label>
      <label>
        {busy ? 'Завантаження…' : 'Завантажити файл'}
        <input
          type='file'
          accept='image/jpeg,image/png,image/webp,image/gif'
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            await handleFile(file);
          }}
        />
      </label>
      {onAltChange ? (
        <label>
          Alt текст
          <input value={alt || ''} onChange={(e) => onAltChange(e.target.value)} />
        </label>
      ) : null}
      {value ? (
        <div className='admin-image-preview'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={alt || ''} />
        </div>
      ) : null}
    </div>
  );
}
