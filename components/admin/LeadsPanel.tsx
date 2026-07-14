'use client';

import { useCallback, useEffect, useState } from 'react';
import { showToast } from './AdminToast';

interface Lead {
  id: string;
  phone: string;
  createdAt: string;
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

export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) {
        showToast('Не вдалося завантажити заявки', 'error');
        return;
      }
      const json = (await res.json()) as { leads?: Lead[] };
      setLeads(json.leads || []);
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
    const res = await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, handled }),
    });
    if (!res.ok) {
      showToast('Не вдалося оновити', 'error');
      return;
    }
    showToast(handled ? 'Позначено обробленою' : 'Повернуто в нові', 'success');
    await load();
  }

  async function remove(id: string) {
    if (!confirm('Видалити заявку?')) return;
    const res = await fetch('/api/leads', {
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

  const visible = leads.filter((l) => {
    if (filter === 'open') return !l.handled;
    if (filter === 'done') return l.handled;
    return true;
  });

  const openCount = leads.filter((l) => !l.handled).length;

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
            aria-label='Фільтр заявок'
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
        <p className='admin-hint'>Немає заявок у цьому фільтрі.</p>
      ) : null}

      <ul className='admin-leads-list'>
        {visible.map((lead) => (
          <li key={lead.id} className={`admin-lead-item${lead.handled ? ' is-handled' : ''}`}>
            <div className='admin-lead-main'>
              <a className='admin-lead-phone' href={`tel:${lead.phone.replace(/\D/g, '')}`}>
                {lead.phone}
              </a>
              <span className='admin-lead-meta'>{formatWhen(lead.createdAt)}</span>
              <span className='admin-lead-meta'>
                {lead.emailed ? 'email ✓' : 'без email'} · {lead.source}
              </span>
            </div>
            <div className='admin-row'>
              {!lead.handled ? (
                <button type='button' className='admin-btn' onClick={() => void setHandled(lead.id, true)}>
                  Оброблено
                </button>
              ) : (
                <button
                  type='button'
                  className='admin-btn admin-btn--secondary'
                  onClick={() => void setHandled(lead.id, false)}
                >
                  Відкрити знову
                </button>
              )}
              <button type='button' className='admin-btn admin-btn--danger' onClick={() => void remove(lead.id)}>
                Видалити
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
