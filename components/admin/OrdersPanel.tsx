'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TimeFilter } from '@/lib/journal-filter';
import { matchesPhoneQuery, matchesTimeFilter } from '@/lib/journal-filter';
import { formatTelHref } from '@/lib/phone';
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
  handledAt?: string;
  audit?: { at: string; action: string }[];
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
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [phoneQ, setPhoneQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) {
        if (res.status === 401) showToast('Сесія закінчилась — увійдіть знову', 'error');
        else showToast('Не вдалося завантажити замовлення', 'error');
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

  async function patchOrder(id: string, body: { handled?: boolean; note?: string }, okMsg: string) {
    setBusyId(id);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) {
        showToast('Не вдалося оновити', 'error');
        return;
      }
      showToast(okMsg, 'success');
      await load();
    } catch {
      showToast('Мережева помилка', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Видалити замовлення?')) return;
    setBusyId(id);
    try {
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
    } catch {
      showToast('Мережева помилка', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const visible = useMemo(() => {
    return orders.filter((o) => {
      if (filter === 'open' && o.handled) return false;
      if (filter === 'done' && !o.handled) return false;
      if (!matchesTimeFilter(o.createdAt, timeFilter)) return false;
      if (!matchesPhoneQuery(o.phone, phoneQ)) return false;
      return true;
    });
  }, [orders, filter, timeFilter, phoneQ]);

  const openCount = orders.filter((o) => !o.handled).length;

  return (
    <div className='admin-card'>
      <div className='admin-row admin-row--between admin-mb'>
        <h2 className='admin-h2' style={{ margin: 0 }}>
          Журнал {openCount > 0 ? <span className='admin-badge'>{openCount} нових</span> : null}
        </h2>
        <div className='admin-row admin-row--wrap'>
          <select
            className='admin-select'
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            aria-label='Статус'
          >
            <option value='open'>Нові</option>
            <option value='done'>Опрацьовані</option>
            <option value='all'>Усі</option>
          </select>
          <select
            className='admin-select'
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            aria-label='Період'
          >
            <option value='all'>Весь час</option>
            <option value='today'>Сьогодні</option>
            <option value='week'>7 днів</option>
          </select>
          <input
            type='search'
            className='admin-field-sm'
            placeholder='Телефон…'
            value={phoneQ}
            onChange={(e) => setPhoneQ(e.target.value)}
            aria-label='Пошук за телефоном'
          />
          <a className='admin-btn admin-btn--secondary' href='/api/orders?format=csv'>
            CSV
          </a>
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
        {visible.map((order) => {
          const noteVal = noteDraft[order.id] ?? order.note ?? '';
          const busy = busyId === order.id;
          return (
            <li key={order.id} className={`admin-lead-item${order.handled ? ' is-handled' : ''}`}>
              <div className='admin-lead-main'>
                <a className='admin-lead-phone' href={formatTelHref(order.phone)}>
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
                  {order.handledAt ? ` · оброблено ${formatWhen(order.handledAt)}` : ''}
                </span>
                {order.audit && order.audit.length > 0 ? (
                  <span className='admin-lead-meta'>
                    Історія: {order.audit.slice(-3).map((a) => a.action).join(' → ')}
                  </span>
                ) : null}
                <a
                  className='admin-lead-meta'
                  href={`/shop/${order.product.id}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Сторінка товару ↗
                </a>
                <label className='admin-lead-meta' style={{ display: 'block', marginTop: 6 }}>
                  Нотатка
                  <input
                    className='admin-grow'
                    style={{ display: 'block', width: '100%', marginTop: 4 }}
                    value={noteVal}
                    disabled={busy}
                    onChange={(e) => setNoteDraft((d) => ({ ...d, [order.id]: e.target.value }))}
                    onBlur={() => {
                      const next = (noteDraft[order.id] ?? order.note ?? '').trim();
                      const prev = (order.note || '').trim();
                      if (next === prev) return;
                      void patchOrder(order.id, { note: next }, 'Нотатку збережено');
                    }}
                    placeholder='Коментар оператора…'
                  />
                </label>
              </div>
              <div className='admin-row'>
                {!order.handled ? (
                  <button
                    type='button'
                    className='admin-btn'
                    disabled={busy}
                    onClick={() => void patchOrder(order.id, { handled: true }, 'Позначено обробленим')}
                  >
                    Оброблено
                  </button>
                ) : (
                  <button
                    type='button'
                    className='admin-btn admin-btn--secondary'
                    disabled={busy}
                    onClick={() => void patchOrder(order.id, { handled: false }, 'Повернуто в нові')}
                  >
                    Відкрити знову
                  </button>
                )}
                <button
                  type='button'
                  className='admin-btn admin-btn--danger'
                  disabled={busy}
                  onClick={() => void remove(order.id)}
                >
                  Видалити
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
