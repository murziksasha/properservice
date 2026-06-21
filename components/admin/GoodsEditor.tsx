'use client';

import type { Product, SiteData } from '@/lib/types';
import { useState } from 'react';

function emptyProduct(): Product {
  return {
    id: Math.random().toString(36).slice(2, 10),
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

  async function save(nextData?: SiteData) {
    const payload = nextData ?? data;
    const res = await fetch('/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert('Помилка збереження');
      return false;
    }
    if (nextData) setData(nextData);
    return true;
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();
    return json.url as string;
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
    alert('Товар збережено! Переглянути: /shop');
  }

  function deleteProduct(id: string) {
    setData({ ...data, goods: data.goods.filter((g) => g.id !== id) });
  }

  return (
    <div>
      <div className="admin-row" style={{ marginBottom: 16 }}>
        <button type="button" className="admin-btn" onClick={async () => { if (await save()) alert('Збережено'); }}>Зберегти всі</button>
        <a href="/shop" target="_blank" className="admin-btn admin-btn--secondary">Відкрити магазин ↗</a>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setEditing(emptyProduct())}>+ Товар</button>
      </div>

      {editing ? (
        <div className="admin-card admin-form">
          <h3>{data.goods.some((g) => g.id === editing.id) ? 'Редагувати' : 'Новий товар'}</h3>
          <label>Назва<input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
          <label>Ціна<input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></label>
          <label>Опис<textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>
          <label>Зображення (URL)<input value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></label>
          <label>Завантажити<input type="file" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = await uploadImage(file);
            setEditing({ ...editing, image: url });
          }} /></label>
          <label><input type="checkbox" checked={editing.visible} onChange={(e) => setEditing({ ...editing, visible: e.target.checked })} /> Опубліковано</label>
          <div className="admin-row">
            <button type="button" className="admin-btn" onClick={saveProduct}>OK</button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setEditing(null)}>Скасувати</button>
          </div>
        </div>
      ) : null}

      <div className="admin-card">
        {data.goods.map((product) => (
          <div key={product.id} className="admin-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span>{product.title} — {product.price} ₴ {!product.visible ? '(приховано)' : ''}</span>
            <div className="admin-row">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setEditing(product)}>✎</button>
              <button type="button" className="admin-btn admin-btn--danger" onClick={() => deleteProduct(product.id)}>×</button>
            </div>
          </div>
        ))}
        {!data.goods.length ? <p>Товарів ще немає</p> : null}
      </div>
    </div>
  );
}