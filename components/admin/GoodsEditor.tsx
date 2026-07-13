'use client';

import type { Product, SiteData } from '@/lib/types';
import { createId } from '@/lib/id';
import { saveSiteData } from '@/lib/admin/saveSite';
import { uploadImage } from '@/lib/admin/uploadImage';
import { useState } from 'react';
import { showToast } from './AdminToast';

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

  async function save(nextData?: SiteData) {
    const payload = nextData ?? data;
    setSaving(true);
    const result = await saveSiteData(payload);
    setSaving(false);
    if (!result.ok) {
      showToast(result.error, 'error');
      return false;
    }
    if (nextData) setData(nextData);
    showToast('Збережено', 'success');
    return true;
  }

  async function saveProduct() {
    if (!editing) return;
    const goods = [...data.goods];
    const idx = goods.findIndex((g) => g.id === editing.id);
    if (idx >= 0) goods[idx] = editing;
    else goods.push(editing);
    const nextData = { ...data, goods };
    const ok = await save(nextData);
    if (!ok) return;
    setEditing(null);
  }

  function deleteProduct(id: string) {
    setData({ ...data, goods: data.goods.filter((g) => g.id !== id) });
  }

  return (
    <div>
      <div className='admin-toolbar'>
        <button
          type='button'
          className='admin-btn'
          disabled={saving}
          onClick={async () => {
            await save();
          }}
        >
          {saving ? 'Збереження…' : 'Зберегти всі'}
        </button>
        <a href='/shop' target='_blank' rel='noreferrer' className='admin-btn admin-btn--secondary'>
          Відкрити магазин ↗
        </a>
        <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setEditing(emptyProduct())}>
          + Товар
        </button>
      </div>

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
          <label>
            Зображення (URL)
            <input value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
          </label>
          <label>
            Завантажити
            <input
              type='file'
              accept='image/*'
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const { url, error } = await uploadImage(file);
                if (!url) {
                  showToast(error || 'Помилка завантаження', 'error');
                  return;
                }
                setEditing({ ...editing, image: url });
              }}
            />
          </label>
          <label className='admin-check'>
            <input
              type='checkbox'
              checked={editing.visible}
              onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
            />
            Опубліковано
          </label>
          <div className='admin-row'>
            <button type='button' className='admin-btn' onClick={saveProduct} disabled={saving}>
              OK
            </button>
            <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setEditing(null)}>
              Скасувати
            </button>
          </div>
        </div>
      ) : null}

      <div className='admin-card'>
        {data.goods.map((product) => (
          <div key={product.id} className='admin-row admin-row--between admin-mb'>
            <span>
              {product.title} — {product.price} ₴ {!product.visible ? '(приховано)' : ''}
            </span>
            <div className='admin-row'>
              <button type='button' className='admin-btn admin-btn--secondary' onClick={() => setEditing(product)}>
                ✎
              </button>
              <button type='button' className='admin-btn admin-btn--danger' onClick={() => deleteProduct(product.id)}>
                ×
              </button>
            </div>
          </div>
        ))}
        {!data.goods.length ? <p>Товарів ще немає</p> : null}
      </div>
    </div>
  );
}
