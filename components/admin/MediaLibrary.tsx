'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadImage } from '@/lib/admin/uploadImage';
import { parseRetryAfterSeconds, rateLimitMessage } from '@/lib/admin/rateLimitUi';
import { reorderItems } from '@/lib/admin/reorder';
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
  folderId: string;
  sortOrder: number;
  alt?: string;
  width?: number;
  height?: number;
}

interface FolderRow {
  id: string;
  label: string;
  sortOrder: number;
  count: number;
}

type FolderFilter = 'all' | 'root' | string;
type SortMode = 'mtime' | 'name' | 'manual';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [counts, setCounts] = useState({ all: 0, root: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [purpose, setPurpose] = useState<MediaPurpose | 'all'>('all');
  const [folder, setFolder] = useState<FolderFilter>('all');
  const [sort, setSort] = useState<SortMode>('mtime');
  const [uploading, setUploading] = useState(false);
  const [preset, setPreset] = useState<ImagePresetId>('default');
  const [uploadPurpose, setUploadPurpose] = useState<MediaPurpose>('other');
  const [tagsInput, setTagsInput] = useState('');
  const [newFolderLabel, setNewFolderLabel] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editPurpose, setEditPurpose] = useState<MediaPurpose>('other');
  const [editTags, setEditTags] = useState('');
  const [editFolderId, setEditFolderId] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (purpose !== 'all') params.set('purpose', purpose);
      if (q.trim()) params.set('q', q.trim());
      if (folder !== 'all') params.set('folder', folder);
      params.set('sort', sort);
      const res = await fetch(`/api/media?${params.toString()}`);
      if (!res.ok) {
        showToast('Не вдалося завантажити медіа', 'error');
        return;
      }
      const json = (await res.json()) as {
        items?: MediaItem[];
        folders?: FolderRow[];
        counts?: { all?: number; root?: number };
      };
      setItems(json.items || []);
      setFolders(json.folders || []);
      setCounts({
        all: json.counts?.all ?? 0,
        root: json.counts?.root ?? 0,
      });
    } catch {
      showToast('Мережева помилка', 'error');
    } finally {
      setLoading(false);
    }
  }, [purpose, q, folder, sort]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    setUploadPurpose(purposeFromPreset(preset));
  }, [preset]);

  const uploadFolderId =
    folder !== 'all' && folder !== 'root' ? folder : '';

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const { url, error, width, height } = await uploadImage(file, {
        preset,
        purpose: uploadPurpose,
        tags: tagsInput,
        folderId: uploadFolderId || undefined,
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

  async function createFolder() {
    const label = newFolderLabel.trim();
    if (!label) return;
    try {
      const res = await fetch('/api/media/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        showToast('Не вдалося створити папку', 'error');
        return;
      }
      const json = (await res.json()) as { folder?: FolderRow };
      setNewFolderLabel('');
      showToast('Папку створено', 'success');
      if (json.folder?.id) setFolder(json.folder.id);
      await load();
    } catch {
      showToast('Мережева помилка', 'error');
    }
  }

  async function renameFolder(id: string, label: string) {
    const next = label.trim();
    if (!next) return;
    try {
      const res = await fetch('/api/media/folders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label: next }),
      });
      if (!res.ok) {
        showToast('Не вдалося перейменувати', 'error');
        return;
      }
      showToast('Перейменовано', 'success');
      await load();
    } catch {
      showToast('Мережева помилка', 'error');
    }
  }

  async function deleteFolder(id: string, label: string) {
    if (
      !confirm(
        `Видалити папку «${label}»? Файли залишаться в «Без папки» (URL не зміняться).`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch('/api/media/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        showToast('Не вдалося видалити папку', 'error');
        return;
      }
      if (folder === id) setFolder('all');
      showToast('Папку видалено', 'success');
      await load();
    } catch {
      showToast('Мережева помилка', 'error');
    }
  }

  function startEdit(item: MediaItem) {
    setEditing(item.name);
    setEditPurpose(item.purpose || 'other');
    setEditTags((item.tags || []).join(', '));
    setEditFolderId(item.folderId || '');
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
          folderId: editFolderId || 'root',
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

  async function persistOrder(nextItems: MediaItem[]) {
    const orderedNames = nextItems.map((i) => i.name);
    const reorderFolderId =
      folder === 'all' ? '' : folder === 'root' ? '' : folder;
    try {
      const res = await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedNames, reorderFolderId }),
      });
      if (!res.ok) {
        showToast('Не вдалося зберегти порядок', 'error');
        await load();
        return;
      }
    } catch {
      showToast('Мережева помилка', 'error');
      await load();
    }
  }

  function onReorder(from: number, to: number) {
    if (sort !== 'manual') return;
    const next = reorderItems(items, from, to);
    setItems(next);
    void persistOrder(next);
  }

  const canDnD = sort === 'manual' && folder !== 'all';
  const totalBytes = items.reduce((s, i) => s + i.size, 0);

  return (
    <div className='admin-media-layout'>
      <aside className='admin-media-folders admin-card'>
        <h2 className='admin-h2' style={{ marginTop: 0 }}>
          Папки
        </h2>
        <button
          type='button'
          className={`admin-folder-item${folder === 'all' ? ' is-active' : ''}`}
          onClick={() => setFolder('all')}
        >
          <span>Усі файли</span>
          <span className='admin-folder-count'>{counts.all}</span>
        </button>
        <button
          type='button'
          className={`admin-folder-item${folder === 'root' ? ' is-active' : ''}`}
          onClick={() => setFolder('root')}
        >
          <span>Без папки</span>
          <span className='admin-folder-count'>{counts.root}</span>
        </button>
        {folders.map((f) => (
          <div key={f.id} className='admin-folder-row'>
            <button
              type='button'
              className={`admin-folder-item${folder === f.id ? ' is-active' : ''}`}
              onClick={() => setFolder(f.id)}
            >
              <span title={f.label}>{f.label}</span>
              <span className='admin-folder-count'>{f.count}</span>
            </button>
            <button
              type='button'
              className='admin-btn admin-btn--secondary admin-btn--tiny'
              title='Перейменувати'
              onClick={() => {
                const label = prompt('Назва папки', f.label);
                if (label != null) void renameFolder(f.id, label);
              }}
            >
              ✎
            </button>
            <button
              type='button'
              className='admin-btn admin-btn--danger admin-btn--tiny'
              title='Видалити папку'
              onClick={() => void deleteFolder(f.id, f.label)}
            >
              ×
            </button>
          </div>
        ))}
        <div className='admin-folder-create'>
          <input
            value={newFolderLabel}
            onChange={(e) => setNewFolderLabel(e.target.value)}
            placeholder='Нова папка…'
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void createFolder();
              }
            }}
          />
          <button type='button' className='admin-btn' onClick={() => void createFolder()}>
            +
          </button>
        </div>
        <p className='admin-hint' style={{ marginBottom: 0 }}>
          Віртуальні папки: URL файлів не змінюються.
        </p>
      </aside>

      <div className='admin-card admin-form'>
        <div className='admin-row admin-row--between admin-mb'>
          <h2 className='admin-h2' style={{ margin: 0 }}>
            Файли
          </h2>
          <span className='admin-hint' style={{ margin: 0 }}>
            {items.length} у вигляді · {formatBytes(totalBytes)}
          </span>
        </div>

        <div className='admin-media-chips admin-mb' role='tablist' aria-label='Роль зображення'>
          <button
            type='button'
            role='tab'
            className={`admin-chip${purpose === 'all' ? ' admin-chip--active' : ''}`}
            aria-selected={purpose === 'all'}
            onClick={() => setPurpose('all')}
          >
            Усі ролі
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
                  {IMAGE_PRESETS[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className='admin-inline-label'>
            Роль
            <select
              value={uploadPurpose}
              onChange={(e) => setUploadPurpose(e.target.value as MediaPurpose)}
              disabled={uploading}
              aria-label='Роль для нового файлу'
            >
              {MEDIA_PURPOSE_IDS.map((id) => (
                <option key={id} value={id}>
                  {MEDIA_PURPOSES[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className='admin-inline-label'>
            Сортування
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              aria-label='Сортування'
            >
              <option value='mtime'>Новіші спочатку</option>
              <option value='name'>За назвою</option>
              <option value='manual'>Вручну (DnD)</option>
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
            {uploading ? 'Завантаження…' : 'Завантажити'}
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

        {sort === 'manual' && folder === 'all' ? (
          <p className='admin-hint admin-mb'>
            Для ручного порядку оберіть папку (або «Без папки») зліва.
          </p>
        ) : null}

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
          {items.map((item, index) => (
            <div
              key={item.name}
              className={`admin-media-card${
                dragIndex === index ? ' is-dragging' : ''
              }${dragOverIndex === index && dragIndex !== index ? ' is-drop-target' : ''}`}
              draggable={canDnD}
              onDragStart={(e) => {
                if (!canDnD || !(e.target as HTMLElement).closest('.admin-drag-handle')) {
                  e.preventDefault();
                  return;
                }
                setDragIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              onDragOver={(e) => {
                if (!canDnD) return;
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex != null) onReorder(dragIndex, index);
                setDragIndex(null);
                setDragOverIndex(null);
              }}
            >
              {canDnD ? (
                <div className='admin-drag-handle' title='Перетягніть для порядку' aria-hidden>
                  ⠿
                </div>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.alt || item.name} loading='lazy' />
              <div className='admin-media-meta'>
                <span title={item.name}>{item.name}</span>
                <span>
                  {MEDIA_PURPOSES[item.purpose]?.label || item.purpose} · {formatBytes(item.size)}
                </span>
                {item.tags?.length ? (
                  <span className='admin-media-tags'>{item.tags.join(', ')}</span>
                ) : null}
              </div>

              {editing === item.name ? (
                <div className='admin-media-edit'>
                  <label className='admin-inline-label'>
                    Роль
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
                    Папка
                    <select
                      value={editFolderId}
                      onChange={(e) => setEditFolderId(e.target.value)}
                    >
                      <option value=''>Без папки</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
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
                    Мета
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
    </div>
  );
}
