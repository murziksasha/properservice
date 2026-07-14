'use client';

import type { Product, SiteData } from '@/lib/types';
import { createId } from '@/lib/id';
import { saveSiteData } from '@/lib/admin/saveSite';
import { uploadImage } from '@/lib/admin/uploadImage';
import { moveByDir, reorderItems } from '@/lib/admin/reorder';
import { useSaveShortcut, useUnsavedGuard } from '@/lib/admin/useUnsavedGuard';
import { useCallback, useMemo, useState } from 'react';
import { showToast } from './AdminToast';
import { ImageField } from './ImageField';

function emptyProduct(): Product {
  return {
    id: createId(),
    title: 'Новий товар',
    description: '',
    price: 0,
    image: '/img/services/technika_img.png',
    visible: true,
  };
}

export function GoodsEditor({ initialData }: { initialData: SiteData }) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useUnsavedGuard(dirty || Boolean(editing));

  const save = useCallback(
    async (nextData?: SiteData) => {
      const payload = nextData ?? data;
      setSaving(true);
      const result = await saveSiteData(payload);
      setSaving(false);
      if (!result.ok) {
        showToast(result.error, 'error');
        return false;
      }
      setData(payload);
      setDirty(false);
      showToast('Збережено', 'success');
      return true;
    },
    [data],
  );

  useSaveShortcut(
    () => {
      if (editing) return;
      void save();
    },
    { dirty, enabled: !saving && !editing },
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.goods.map((g, index) => ({ g, index }));
    return data.goods
      .map((g, index) => ({ g, index }))
      .filter(({ g }) => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
  }, [data.goods, query]);

  async function saveProduct() {
    if (!editing) return;
    const goods = [...data.goods];
    const idx = goods.findIndex((g) => g.id === editing.id);
    const stamped = {
      ...editing,
      updatedAt: new Date().toISOString(),
      createdAt: editing.createdAt || new Date().toISOString(),
    };
    if (idx >= 0) goods[idx] = stamped;
    else goods.push(stamped);
    const nextData = { ...data, goods };
    const ok = await save(nextData);
    if (!ok) return;
    setEditing(null);
  }

  function deleteProduct(id: string) {
    if (!confirm('Видалити товар?')) return;
    setData({ ...data, goods: data.goods.filter((g) => g.id !== id) });
    setDirty(true);
    if (editing?.id === id) setEditing(null);
  }

  function reorder(from: number, to: number) {
    setData({ ...data, goods: reorderItems(data.goods, from, to) });
    setDirty(true);
  }

  return (
    <div>
      <div className='admin-toolbar'>
        <button type='button' className='admin-btn' disabled={saving} onClick={() => void save()}>
          {saving ? 'Збереження…' : 'Зберегти всі'}
        </button>
        <a href='/shop' target='_blank' rel='noreferrer' className='admin-btn admin-btn--secondary'>
          Відкрити магазин ↗
        </a>
        <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setEditing(emptyProduct())}>
          + Товар
        </button>
        <input
          className='admin-field-sm'
          style={{ minWidth: 180, maxWidth: 240 }}
          placeholder='Пошук…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {dirty ? <span className='admin-dirty'>Є незбережені зміни · Ctrl+S</span> : null}
      </div>
      <p className='admin-hint admin-mb'>Порядок у списку = порядок у каталозі. Перетягуйте ⠿ (коли пошук порожній).</p>

      {editing ? (
        <div className='admin-card admin-form'>
          <h3>{data.goods.some((g) => g.id === editing.id) ? 'Редагувати' : 'Новий товар'}</h3>
          <label>
            Назва
            <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </label>
          <label>
            Ціна
            <input
              type='number'
              value={editing.price}
              onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
            />
          </label>
          <label>
            Опис
            <textarea
              rows={3}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </label>
          <ImageField
            value={editing.image}
            onChange={(url) => setEditing({ ...editing, image: url })}
            onUpload={async (file) => {
              const { url, error } = await uploadImage(file);
              if (!url) {
                showToast(error || 'Помилка завантаження', 'error');
                return '';
              }
              return url;
            }}
          />
          <label className='admin-check'>
            <input
              type='checkbox'
              checked={editing.visible}
              onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
            />
            Опубліковано
          </label>
          <div className='admin-row'>
            <button type='button' className='admin-btn' onClick={() => void saveProduct()} disabled={saving}>
              OK
            </button>
            <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setEditing(null)}>
              Скасувати
            </button>
          </div>
        </div>
      ) : null}

      <div className='admin-card'>
        {filtered.map(({ g: product, index }) => {
          const canDrag = !query.trim();
          return (
            <div
              key={product.id}
              className={`admin-section-item admin-row admin-row--between admin-mb${
                dragIndex === index ? ' is-dragging' : ''
              }${dragOverIndex === index && dragIndex !== index ? ' is-drop-target' : ''}`}
              draggable={canDrag}
              onDragStart={(e) => {
                if (!canDrag || !(e.target as HTMLElement).closest('.admin-drag-handle')) {
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
                if (!canDrag) return;
                e.preventDefault();
                setDragOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex != null) reorder(dragIndex, index);
                setDragIndex(null);
                setDragOverIndex(null);
              }}
            >
              <div className='admin-row'>
                {canDrag ? (
                  <span
                    className='admin-drag-handle'
                    title='Перетягнути'
                    role='button'
                    tabIndex={0}
                    aria-label='Перемістити товар'
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setData({ ...data, goods: moveByDir(data.goods, index, -1) });
                        setDirty(true);
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setData({ ...data, goods: moveByDir(data.goods, index, 1) });
                        setDirty(true);
                      }
                    }}
                  >
                    ⠿
                  </span>
                ) : null}
                <span>
                  {product.title} — {product.price} ₴ {!product.visible ? '(приховано)' : ''}
                </span>
              </div>
              <div className='admin-row'>
                <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setEditing(product)}>
                  ✎
                </button>
                <button
                  type='button'
                  className='admin-btn admin-btn--danger'
                  onClick={() => deleteProduct(product.id)}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
        {!data.goods.length ? <p>Товарів ще немає</p> : null}
        {data.goods.length && !filtered.length ? <p className='admin-hint'>Нічого не знайдено</p> : null}
      </div>
    </div>
  );
}
