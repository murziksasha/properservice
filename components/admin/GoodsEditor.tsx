'use client';

import type { Product, SiteData } from '@/lib/types';
import { createId } from '@/lib/id';
import { patchSiteSection, saveSiteData } from '@/lib/admin/saveSite';
import { moveByDir, reorderItems } from '@/lib/admin/reorder';
import { useSaveShortcut, useUnsavedGuard } from '@/lib/admin/useUnsavedGuard';
import {
  DEFAULT_CATEGORY,
  PRODUCT_SORT_OPTIONS,
  UNCATEGORIZED_KEY,
  collectCategories,
  displayCategory,
  filterAndSortProducts,
  groupProductsByCategory,
  isDefaultCategory,
  normalizeCategoryInput,
  renameCategoryInGoods,
  type ProductSort,
  type VisibilityFilter,
} from '@/lib/shop-catalog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showToast } from './AdminToast';
import { GalleryField } from './GalleryField';
import { ImageField } from './ImageField';

type ListMode = 'grouped' | 'flat';

function emptyProduct(): Product {
  return {
    id: createId(),
    title: 'Новий товар',
    description: '',
    price: 0,
    image: '/img/services/technika_img.png',
    images: [],
    visible: true,
    category: '',
    code: '',
  };
}

function reorderReason(opts: {
  query: string;
  visibility: VisibilityFilter;
  categoryFilter: string;
  viewSort: ProductSort;
}): string | null {
  if (opts.query.trim()) return 'Очистіть пошук, щоб змінювати порядок каталогу';
  if (opts.visibility !== 'all') return 'Оберіть фільтр «Усі», щоб змінювати порядок';
  if (opts.categoryFilter.trim()) return 'Скиньте фільтр категорії, щоб змінювати порядок';
  if (opts.viewSort !== 'manual') return 'Оберіть сортування «За порядком каталогу»';
  return null;
}

export function GoodsEditor({ initialData }: { initialData: SiteData }) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewSort, setViewSort] = useState<ProductSort>('manual');
  const [listMode, setListMode] = useState<ListMode>('grouped');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const orderToastAt = useRef(0);
  const editFormRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const prevEditingId = useRef<string | null>(null);

  useUnsavedGuard(dirty || Boolean(editing));

  /** Scroll admin main to the product form and focus title when opening edit/create. */
  useEffect(() => {
    const id = editing?.id ?? null;
    if (!id || id === prevEditingId.current) {
      if (!id) prevEditingId.current = null;
      return;
    }
    prevEditingId.current = id;
    const form = editFormRef.current;
    if (!form) return;

    const run = () => {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Delay focus so smooth scroll isn't interrupted on some browsers
      window.setTimeout(() => {
        titleInputRef.current?.focus({ preventScroll: true });
      }, 280);
    };
    requestAnimationFrame(run);
  }, [editing?.id]);

  const save = useCallback(
    async (nextData?: SiteData) => {
      const payload = nextData ?? data;
      setSaving(true);
      const result = await patchSiteSection('goods', payload.goods, payload.updatedAt);
      setSaving(false);
      if (!result.ok) {
        if (!result.conflict) {
          const full = await saveSiteData(payload);
          if (full.ok) {
            setData({ ...payload, updatedAt: full.updatedAt || payload.updatedAt });
            setDirty(false);
            showToast('Збережено', 'success');
            return true;
          }
          showToast(full.error, 'error');
          return false;
        }
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

  /** Named + «Інше» when present — for select/chips/datalist. */
  const categorySuggestions = useMemo(() => collectCategories(data.goods), [data.goods]);

  const categoryChipStats = useMemo(() => {
    return categorySuggestions.map((cat) => {
      const items =
        cat === DEFAULT_CATEGORY
          ? data.goods.filter((g) => isDefaultCategory(g))
          : data.goods.filter((g) => (g.category || '').trim() === cat);
      return {
        cat,
        total: items.length,
        visible: items.filter((g) => g.visible).length,
      };
    });
  }, [data.goods, categorySuggestions]);

  const filtersActive = useMemo(() => {
    return (
      Boolean(query.trim()) ||
      visibility !== 'all' ||
      Boolean(categoryFilter.trim()) ||
      viewSort !== 'manual'
    );
  }, [query, visibility, categoryFilter, viewSort]);

  function resetFilters() {
    setQuery('');
    setVisibility('all');
    setCategoryFilter('');
    setViewSort('manual');
  }

  const filtered = useMemo(() => {
    const list = filterAndSortProducts(data.goods, {
      query,
      sort: viewSort,
      visibility,
      category: categoryFilter || undefined,
    });
    return list.map((g) => ({
      product: g,
      index: data.goods.findIndex((item) => item.id === g.id),
    }));
  }, [data.goods, query, viewSort, visibility, categoryFilter]);

  const groups = useMemo(() => {
    const products = filtered.map((f) => f.product);
    return groupProductsByCategory(products);
  }, [filtered]);

  const blockReason = reorderReason({ query, visibility, categoryFilter, viewSort });
  const canReorder = !blockReason;

  function markOrderDirty() {
    setDirty(true);
    const now = Date.now();
    if (now - orderToastAt.current > 4000) {
      orderToastAt.current = now;
      showToast('Порядок змінено — натисніть «Зберегти всі»', 'success');
    }
  }

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
      category: normalizeCategoryInput(editing.category),
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

  function toggleVisible(id: string) {
    setData({
      ...data,
      goods: data.goods.map((g) => (g.id === id ? { ...g, visible: !g.visible } : g)),
    });
    setDirty(true);
  }

  function duplicateProduct(product: Product) {
    const copy: Product = {
      ...product,
      id: createId(),
      title: `${product.title} (копія)`,
      visible: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData({ ...data, goods: [...data.goods, copy] });
    setDirty(true);
    setEditing(copy);
  }

  function reorderById(fromId: string, toId: string) {
    if (fromId === toId) return;
    const from = data.goods.findIndex((g) => g.id === fromId);
    const to = data.goods.findIndex((g) => g.id === toId);
    if (from < 0 || to < 0) return;
    setData({ ...data, goods: reorderItems(data.goods, from, to) });
    markOrderDirty();
  }

  function moveProduct(id: string, dir: -1 | 1) {
    const index = data.goods.findIndex((g) => g.id === id);
    if (index < 0) return;
    const next = moveByDir(data.goods, index, dir);
    if (next === data.goods) return;
    setData({ ...data, goods: next });
    markOrderDirty();
  }

  function commitRename(fromKey: string) {
    // Default «Інше» bucket is fixed — assign a real name by editing products or
    // only rename named groups.
    if (fromKey === UNCATEGORIZED_KEY) {
      setRenamingKey(null);
      return;
    }
    const nextName = renameValue.trim();
    if (!nextName || nextName === fromKey) {
      setRenamingKey(null);
      return;
    }
    setData({ ...data, goods: renameCategoryInGoods(data.goods, fromKey, nextName) });
    setDirty(true);
    setRenamingKey(null);
    if (categoryFilter === fromKey) {
      setCategoryFilter(normalizeCategoryInput(nextName) ?? DEFAULT_CATEGORY);
    }
    showToast(
      `Категорію перейменовано: ${normalizeCategoryInput(nextName) ?? DEFAULT_CATEGORY}`,
      'success',
    );
  }

  function renderProductRow(product: Product, index: number) {
    const isHidden = !product.visible;
    const isDragging = dragId === product.id;
    const isDrop = dragOverId === product.id && dragId !== product.id;

    return (
      <div
        key={product.id}
        className={`admin-goods-row admin-section-item${isHidden ? ' is-hidden-section' : ''}${
          isDragging ? ' is-dragging' : ''
        }${isDrop ? ' is-drop-target' : ''}`}
        onDragOver={(e) => {
          if (!canReorder || !dragId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverId(product.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const fromId = e.dataTransfer.getData('text/plain') || dragId;
          if (fromId) reorderById(fromId, product.id);
          setDragId(null);
          setDragOverId(null);
        }}
      >
        <span
          className={`admin-drag-handle${canReorder ? '' : ' is-disabled'}`}
          title={canReorder ? 'Перетягнути' : blockReason || 'Порядок недоступний'}
          role='button'
          tabIndex={canReorder ? 0 : -1}
          aria-label={canReorder ? 'Перемістити товар' : blockReason || 'Порядок недоступний'}
          aria-disabled={!canReorder}
          draggable={canReorder}
          onDragStart={(e) => {
            if (!canReorder) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', product.id);
            setDragId(product.id);
          }}
          onDragEnd={() => {
            setDragId(null);
            setDragOverId(null);
          }}
          onKeyDown={(e) => {
            if (!canReorder) return;
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              moveProduct(product.id, -1);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              moveProduct(product.id, 1);
            }
          }}
        >
          ⠿
        </span>

        <div className='admin-goods-row__thumb' aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image || '/img/services/technika_img.png'} alt='' />
        </div>

        <div className='admin-goods-row__meta'>
          <div className='admin-goods-row__title'>{product.title}</div>
          <div className='admin-goods-row__sub'>
            <span className='admin-goods-row__price'>{product.price} ₴</span>
            {product.code ? <span className='admin-goods-row__code'>{product.code}</span> : null}
            <span
              className={`admin-goods-pill${isDefaultCategory(product) ? ' admin-goods-pill--muted' : ''}`}
            >
              {displayCategory(product)}
            </span>
          </div>
        </div>

        <div className='admin-goods-row__status'>
          <span className={`admin-status-badge ${isHidden ? 'admin-status-badge--off' : 'admin-status-badge--on'}`}>
            {isHidden ? 'Приховано' : 'Опубліковано'}
          </span>
        </div>

        <div className='admin-goods-row__actions'>
          <button
            type='button'
            className='admin-btn admin-btn--secondary admin-btn--sm'
            title={isHidden ? 'Опублікувати' : 'Приховати'}
            aria-label={isHidden ? 'Опублікувати товар' : 'Приховати товар'}
            onClick={() => toggleVisible(product.id)}
          >
            {isHidden ? '👁' : '👁‍🗨'}
          </button>
          <button
            type='button'
            className='admin-btn admin-btn--secondary admin-btn--sm'
            title='Редагувати'
            aria-label='Редагувати'
            onClick={() => setEditing(product)}
          >
            ✎
          </button>
          <button
            type='button'
            className='admin-btn admin-btn--secondary admin-btn--sm'
            title='Дублікат'
            aria-label='Дублікувати товар'
            onClick={() => duplicateProduct(product)}
          >
            ⧉
          </button>
          <button
            type='button'
            className='admin-btn admin-btn--danger admin-btn--sm'
            title='Видалити'
            aria-label='Видалити'
            onClick={() => deleteProduct(product.id)}
          >
            ×
          </button>
        </div>

        {/* index kept for potential keyboard context; not shown */}
        <span className='admin-sr-only'>{index + 1}</span>
      </div>
    );
  }

  return (
    <div className='admin-goods'>
      <div className='admin-goods-toolbar'>
        <div className='admin-goods-toolbar__row'>
          <button type='button' className='admin-btn' disabled={saving} onClick={() => void save()}>
            {saving ? 'Збереження…' : 'Зберегти всі'}
          </button>
          <a href='/shop' target='_blank' rel='noreferrer' className='admin-btn admin-btn--secondary'>
            Відкрити магазин ↗
          </a>
          <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setEditing(emptyProduct())}>
            + Товар
          </button>
          {dirty ? <span className='admin-dirty'>Є незбережені зміни · Ctrl+S</span> : null}
        </div>

        <div className='admin-goods-toolbar__row admin-goods-toolbar__filters'>
          <input
            className='admin-field-sm admin-goods-search'
            type='search'
            placeholder='Пошук: назва, код, категорія…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label='Пошук товарів'
          />
          <select
            className='admin-select admin-field-sm'
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label='Фільтр категорії'
          >
            <option value=''>Усі категорії</option>
            {categorySuggestions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            className='admin-select admin-field-sm'
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
          <button
            type='button'
            className='admin-btn admin-btn--secondary admin-btn--sm'
            onClick={resetFilters}
            disabled={!filtersActive}
            title={filtersActive ? 'Скинути пошук, фільтри та сортування' : 'Фільтри вже за замовчуванням'}
            aria-label='Скинути фільтри'
          >
            Скинути фільтри
          </button>
          <div className='admin-goods-mode' role='group' aria-label='Режим списку'>
            <button
              type='button'
              className={`admin-btn admin-btn--secondary admin-btn--sm${listMode === 'grouped' ? ' is-active' : ''}`}
              onClick={() => setListMode('grouped')}
            >
              Групи
            </button>
            <button
              type='button'
              className={`admin-btn admin-btn--secondary admin-btn--sm${listMode === 'flat' ? ' is-active' : ''}`}
              onClick={() => setListMode('flat')}
            >
              Плоский
            </button>
          </div>
        </div>

        {categoryChipStats.length ? (
          <div className='admin-goods-chips' role='group' aria-label='Швидкий фільтр категорій'>
            <button
              type='button'
              className={`admin-chip${categoryFilter === '' ? ' is-active' : ''}`}
              onClick={() => setCategoryFilter('')}
            >
              Усі ({counts.all})
            </button>
            {categoryChipStats.map(({ cat, total, visible }) => {
              const filterValue = cat === DEFAULT_CATEGORY ? DEFAULT_CATEGORY : cat;
              const isActive =
                categoryFilter === filterValue ||
                (cat === DEFAULT_CATEGORY && categoryFilter === UNCATEGORIZED_KEY);
              return (
                <button
                  key={cat}
                  type='button'
                  className={`admin-chip${isActive ? ' is-active' : ''}`}
                  onClick={() => setCategoryFilter(isActive ? '' : filterValue)}
                >
                  {cat} ({visible}/{total})
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {blockReason ? (
        <p className='admin-hint admin-goods-reorder-hint admin-mb' role='status'>
          Порядок каталогу (⠿ / ↑↓): <strong>заблоковано</strong> — {blockReason}. Сортування списку вище —
          лише для перегляду.
        </p>
      ) : (
        <p className='admin-hint admin-mb'>
          Перетягуйте ⠿ або стрілки ↑↓ на handle, щоб задати порядок на сайті. Після зміни натисніть «Зберегти
          всі». Групи = категорії вітрини.
        </p>
      )}

      {editing ? (
        <div
          ref={editFormRef}
          id='goods-edit-form'
          className='admin-card admin-form admin-form--editing admin-mb-lg'
          tabIndex={-1}
        >
          <h3>{data.goods.some((g) => g.id === editing.id) ? 'Редагувати товар' : 'Новий товар'}</h3>
          <label>
            Назва
            <input
              ref={titleInputRef}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
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
          <ImageField
            label='Головне фото'
            value={editing.image}
            onChange={(url) => setEditing({ ...editing, image: url })}
            preset='product'
          />
          <GalleryField
            label='Галерея'
            value={editing.images || []}
            excludeUrl={editing.image}
            onChange={(images) => setEditing({ ...editing, images })}
            preset='product'
          />
          <label>
            Категорія (група на сайті)
            <input
              list='goods-category-suggestions'
              value={editing.category || ''}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              placeholder={`Напр. Телефони, ТВ… (порожньо = ${DEFAULT_CATEGORY})`}
            />
            <datalist id='goods-category-suggestions'>
              {categorySuggestions
                .filter((cat) => cat !== DEFAULT_CATEGORY)
                .map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              <option value={DEFAULT_CATEGORY} />
            </datalist>
            <span className='admin-hint'>
              Опційно. Порожнє поле = «{DEFAULT_CATEGORY}». Однакова назва об’єднує товари в групу в
              адмінці та на /shop.
            </span>
          </label>
          <label>
            Опис
            <textarea
              rows={3}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </label>
          <label className='admin-check admin-goods-publish'>
            <input
              type='checkbox'
              checked={editing.visible}
              onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
            />
            <span>
              <strong>Опубліковано</strong>
              <span className='admin-hint' style={{ marginTop: 0 }}>
                {' '}
                — показувати у магазині /shop
              </span>
            </span>
          </label>
          <div className='admin-row'>
            <button type='button' className='admin-btn' onClick={() => void saveProduct()} disabled={saving}>
              Зберегти товар
            </button>
            <button
              type='button'
              className='admin-btn admin-btn--secondary'
              onClick={() => {
                if (!confirm('Скасувати зміни товару?')) return;
                setEditing(null);
              }}
            >
              Скасувати
            </button>
          </div>
        </div>
      ) : null}

      <div className='admin-card admin-goods-list'>
        {!data.goods.length ? <p>Товарів ще немає. Натисніть «+ Товар».</p> : null}
        {data.goods.length && !filtered.length ? <p className='admin-hint'>Нічого не знайдено</p> : null}

        {listMode === 'flat'
          ? filtered.map(({ product, index }) => renderProductRow(product, index))
          : groups.map((group) => {
              const isCollapsed = Boolean(collapsed[group.key]);
              return (
                <section key={group.key} className='admin-goods-group'>
                  <header className='admin-goods-group__head'>
                    <button
                      type='button'
                      className='admin-goods-group__toggle'
                      aria-expanded={!isCollapsed}
                      onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !c[group.key] }))}
                    >
                      <span aria-hidden>{isCollapsed ? '▸' : '▾'}</span>
                      {renamingKey === group.key ? (
                        <input
                          className='admin-goods-group__rename'
                          value={renameValue}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitRename(group.key);
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setRenamingKey(null);
                            }
                          }}
                          onBlur={() => commitRename(group.key)}
                          aria-label='Нова назва категорії'
                        />
                      ) : (
                        <span className='admin-goods-group__title'>{group.label}</span>
                      )}
                      <span className='admin-goods-group__count'>
                        {group.visibleCount}/{group.total} опубл.
                      </span>
                    </button>
                    {group.key !== UNCATEGORIZED_KEY && renamingKey !== group.key ? (
                      <button
                        type='button'
                        className='admin-btn admin-btn--secondary admin-btn--sm'
                        onClick={() => {
                          setRenamingKey(group.key);
                          setRenameValue(group.label);
                        }}
                      >
                        Перейменувати
                      </button>
                    ) : null}
                    <button
                      type='button'
                      className='admin-btn admin-btn--secondary admin-btn--sm'
                      onClick={() => {
                        const filterValue =
                          group.key === UNCATEGORIZED_KEY ? DEFAULT_CATEGORY : group.key;
                        const active =
                          categoryFilter === filterValue ||
                          (group.key === UNCATEGORIZED_KEY &&
                            categoryFilter === UNCATEGORIZED_KEY);
                        setCategoryFilter(active ? '' : filterValue);
                      }}
                    >
                      Фільтр
                    </button>
                  </header>
                  {!isCollapsed ? (
                    <div className='admin-goods-group__body'>
                      {group.products.map((product) => {
                        const index = data.goods.findIndex((g) => g.id === product.id);
                        return renderProductRow(product, index);
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
      </div>
    </div>
  );
}
