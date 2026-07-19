'use client';

import type { Product, SiteData } from '@/lib/types';
import { createId } from '@/lib/id';
import { saveSiteData } from '@/lib/admin/saveSite';
import { uploadImage } from '@/lib/admin/uploadImage';
import { moveByDir, reorderItems } from '@/lib/admin/reorder';
import { useSaveShortcut, useUnsavedGuard } from '@/lib/admin/useUnsavedGuard';
import {
  PRODUCT_SORT_OPTIONS,
  collectCategories,
  filterAndSortProducts,
  type ProductSort,
  type VisibilityFilter,
} from '@/lib/shop-catalog';
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
    category: '',
    code: '',
  };
}

export function GoodsEditor({ initialData }: { initialData: SiteData }) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [viewSort, setViewSort] = useState<ProductSort>('manual');
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
      setData({ ...payload, updatedAt: result.updatedAt || payload.updatedAt });
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

  const counts = useMemo(() => {
    const all = data.goods.length;
    const visible = data.goods.filter((g) => g.visible).length;
    return { all, visible, hidden: all - visible };
  }, [data.goods]);

  const categorySuggestions = useMemo(() => collectCategories(data.goods), [data.goods]);

  /** List for display; each item keeps original index in goods[] for DnD. */
  const filtered = useMemo(() => {
    const list = filterAndSortProducts(data.goods, {
      query,
      sort: viewSort,
      visibility,
    });
    return list.map((g) => ({
      g,
      index: data.goods.findIndex((item) => item.id === g.id),
    }));
  }, [data.goods, query, viewSort, visibility]);

  const canReorder = !query.trim() && visibility === 'all' && viewSort === 'manual';

  async function saveProduct() {
    if (!editing) return;
    const codeTrimmed = (editing.code || '').trim();
    if (codeTrimmed.length === 1) {
      showToast('Код товару: мінімум 2 символи (або залиште порожнім)', 'error');
      return;
    }
    const goods = [...data.goods];
    const idx = goods.findIndex((g) => g.id === editing.id);
    const stamped: Product = {
      ...editing,
      category: (editing.category || '').trim() || undefined,
      code: codeTrimmed.length >= 2 ? codeTrimmed : undefined,
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
          type='search'
          placeholder='Пошук…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label='Пошук товарів'
        />
        <select
          className='admin-select admin-field-sm'
          style={{ width: 'auto', marginBottom: 0, minWidth: 160 }}
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as VisibilityFilter)}
          aria-label='Фільтр видимості'
        >
          <option value='all'>Усі ({counts.all})</option>
          <option value='visible'>Опубліковані ({counts.visible})</option>
          <option value='hidden'>Приховані ({counts.hidden})</option>
        </select>
        <select
          className='admin-select admin-field-sm'
          style={{ width: 'auto', marginBottom: 0, minWidth: 180 }}
          value={viewSort}
          onChange={(e) => setViewSort(e.target.value as ProductSort)}
          aria-label='Сортування списку'
        >
          {PRODUCT_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {dirty ? <span className='admin-dirty'>Є незбережені зміни · Ctrl+S</span> : null}
      </div>
      <p className='admin-hint admin-mb'>
        Порядок у каталозі задається перетягуванням ⠿ (коли пошук порожній, фільтр «Усі», сортування «За
        порядком каталогу»). Сортування списку вище — лише для перегляду, воно не змінює порядок на сайті.
      </p>

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
              min={0}
              step={1}
              value={Number.isFinite(editing.price) ? editing.price : 0}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setEditing({ ...editing, price: 0 });
                  return;
                }
                const n = Number(raw);
                setEditing({ ...editing, price: Number.isFinite(n) ? Math.max(0, n) : 0 });
              }}
            />
          </label>
          <label>
            Код товару
            <input
              value={editing.code || ''}
              onChange={(e) => setEditing({ ...editing, code: e.target.value })}
              placeholder='Напр. SKU-12, АКБ/01…'
              autoComplete='off'
            />
            <span className='admin-hint'>
              Необов&apos;язково. Мін. 2 символи. Будь-які мови та знаки. Участь у пошуку в адмінці та магазині.
            </span>
          </label>
          <label>
            Категорія
            <input
              list='goods-category-suggestions'
              value={editing.category || ''}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              placeholder='Напр. Телефони, ТВ…'
            />
            <datalist id='goods-category-suggestions'>
              {categorySuggestions.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            <span className='admin-hint'>Опційно. Використовується для фільтрів у магазині.</span>
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
            <button
              type='button'
              className='admin-btn admin-btn--secondary'
              onClick={() => {
                if (dirty || editing) {
                  if (!confirm('Скасувати зміни товару?')) return;
                }
                setEditing(null);
              }}
            >
              Скасувати
            </button>
          </div>
        </div>
      ) : null}

      <div className='admin-card'>
        {filtered.map(({ g: product, index }) => {
          return (
            <div
              key={product.id}
              className={`admin-section-item admin-row admin-row--between admin-mb${
                dragIndex === index ? ' is-dragging' : ''
              }${dragOverIndex === index && dragIndex !== index ? ' is-drop-target' : ''}`}
              draggable={canReorder}
              onDragStart={(e) => {
                if (!canReorder || !(e.target as HTMLElement).closest('.admin-drag-handle')) {
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
                if (!canReorder) return;
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
                {canReorder ? (
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
                  {product.title} — {product.price} ₴
                  {product.code ? ` · ${product.code}` : ''}
                  {product.category ? ` · ${product.category}` : ''}
                  {!product.visible ? ' (приховано)' : ''}
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
