'use client';

import { useCallback, useEffect, useState } from 'react';
import { showToast } from './AdminToast';

interface OrderProduct {
  id: string;
  title: string;
  price: number;
  code?: string;
}

interface Order {
  id: string;
  phone: string;
  createdAt: string;
  comment?: string;
  quantity: number;
  product: OrderProduct;
  source: string;
  emailed: boolean;
  handled: boolean;
  note?: string;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uk-UA');
  } catch {
    return iso;
  }
}

export function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) {
        showToast('Не вдалося завантажити замовлення', 'error');
        return;
      }
      const json = (await res.json()) as { orders?: Order[] };
      setOrders(json.orders || []);
    } catch {
      showToast('Мережева помилка', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setHandled(id: string, handled: boolean) {
    const res = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, handled }),
    });
    if (!res.ok) {
      showToast('Не вдалося оновити', 'error');
      return;
    }
    showToast(handled ? 'Позначено обробленим' : 'Повернуто в нові', 'success');
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Видалити замовлення?')) return;
    const res = await fetch('/api/orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      showToast('Не вдалося видалити', 'error');
      return;
    }
    showToast('Видалено', 'success');
    await load();
  }

  const visible = orders.filter((o) => {
    if (filter === 'open') return !o.handled;
    if (filter === 'done') return o.handled;
    return true;
  });

  const openCount = orders.filter((o) => !o.handled).length;

  return (
    <div className='admin-card'>
      <div className='admin-row admin-row--between admin-mb'>
        <h2 className='admin-h2' style={{ margin: 0 }}>
          Журнал {openCount > 0 ? <span className='admin-badge'>{openCount} нових</span> : null}
        </h2>
        <div className='admin-row'>
          <select
            className='admin-select'
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            aria-label='Фільтр замовлень'
          >
            <option value='open'>Нові</option>
            <option value='done'>Опрацьовані</option>
            <option value='all'>Усі</option>
          </select>
          <button type='button' className='admin-btn admin-btn--secondary' onClick={() => void load()}>
            Оновити
          </button>
        </div>
      </div>

      {loading ? <p className='admin-hint'>Завантаження…</p> : null}

      {!loading && visible.length === 0 ? (
        <p className='admin-hint'>Немає замовлень у цьому фільтрі.</p>
      ) : null}

      <ul className='admin-leads-list'>
        {visible.map((order) => (
          <li key={order.id} className={`admin-lead-item${order.handled ? ' is-handled' : ''}`}>
            <div className='admin-lead-main'>
              <a className='admin-lead-phone' href={`tel:${order.phone.replace(/\D/g, '')}`}>
                {order.phone}
              </a>
              <span className='admin-lead-meta'>{formatWhen(order.createdAt)}</span>
              <span className='admin-lead-meta'>
                <strong>{order.product.title}</strong>
                {order.product.code ? ` · ${order.product.code}` : ''}
                {' · '}
                {order.product.price.toLocaleString('uk-UA')} ₴ × {order.quantity}
              </span>
              {order.comment ? <span className='admin-lead-meta'>Коментар: {order.comment}</span> : null}
              <span className='admin-lead-meta'>
                {order.emailed ? 'email ✓' : 'без email'} · {order.source}
                {order.note ? ` · нотатка: ${order.note}` : ''}
              </span>
              <a className='admin-lead-meta' href={`/shop/${order.product.id}`} target='_blank' rel='noreferrer'>
                Сторінка товару ↗
              </a>
            </div>
            <div className='admin-row'>
              {!order.handled ? (
                <button type='button' className='admin-btn' onClick={() => void setHandled(order.id, true)}>
                  Оброблено
                </button>
              ) : (
                <button
                  type='button'
                  className='admin-btn admin-btn--secondary'
                  onClick={() => void setHandled(order.id, false)}
                >
                  Відкрити знову
                </button>
              )}
              <button type='button' className='admin-btn admin-btn--danger' onClick={() => void remove(order.id)}>
                Видалити
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
