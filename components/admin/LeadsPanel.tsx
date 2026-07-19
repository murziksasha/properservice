'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatTelHref } from '@/lib/phone';
import { showToast } from './AdminToast';

interface Lead {
  id: string;
  phone: string;
  createdAt: string;
  source: string;
  emailed: boolean;
  handled: boolean;
  note?: string;
  pagePath?: string;
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) {
        if (res.status === 401) showToast('Сесія закінчилась — увійдіть знову', 'error');
        else showToast('Не вдалося завантажити заявки', 'error');
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

  async function patchLead(id: string, body: { handled?: boolean; note?: string }, okMsg: string) {
    setBusyId(id);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) {
        if (res.status === 401) showToast('Сесія закінчилась — увійдіть знову', 'error');
        else showToast('Не вдалося оновити', 'error');
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
    if (!confirm('Видалити заявку?')) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        if (res.status === 401) showToast('Сесія закінчилась — увійдіть знову', 'error');
        else showToast('Не вдалося видалити', 'error');
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
        {visible.map((lead) => {
          const noteVal = noteDraft[lead.id] ?? lead.note ?? '';
          const busy = busyId === lead.id;
          return (
            <li key={lead.id} className={`admin-lead-item${lead.handled ? ' is-handled' : ''}`}>
              <div className='admin-lead-main'>
                <a className='admin-lead-phone' href={formatTelHref(lead.phone)}>
                  {lead.phone}
                </a>
                <span className='admin-lead-meta'>{formatWhen(lead.createdAt)}</span>
                <span className='admin-lead-meta'>
                  {lead.emailed ? 'email ✓' : 'без email'} · {lead.source}
                </span>
                {lead.pagePath ? (
                  <span className='admin-lead-meta' title={lead.pagePath}>
                    {lead.pagePath}
                  </span>
                ) : null}
                <label className='admin-lead-meta' style={{ display: 'block', marginTop: 6 }}>
                  Нотатка
                  <input
                    className='admin-grow'
                    style={{ display: 'block', width: '100%', marginTop: 4 }}
                    value={noteVal}
                    disabled={busy}
                    onChange={(e) => setNoteDraft((d) => ({ ...d, [lead.id]: e.target.value }))}
                    onBlur={() => {
                      const next = (noteDraft[lead.id] ?? lead.note ?? '').trim();
                      const prev = (lead.note || '').trim();
                      if (next === prev) return;
                      void patchLead(lead.id, { note: next }, 'Нотатку збережено');
                    }}
                    placeholder='Коментар оператора…'
                  />
                </label>
              </div>
              <div className='admin-row'>
                {!lead.handled ? (
                  <button
                    type='button'
                    className='admin-btn'
                    disabled={busy}
                    onClick={() => void patchLead(lead.id, { handled: true }, 'Позначено обробленою')}
                  >
                    Оброблено
                  </button>
                ) : (
                  <button
                    type='button'
                    className='admin-btn admin-btn--secondary'
                    disabled={busy}
                    onClick={() => void patchLead(lead.id, { handled: false }, 'Повернуто в нові')}
                  >
                    Відкрити знову
                  </button>
                )}
                <button
                  type='button'
                  className='admin-btn admin-btn--danger'
                  disabled={busy}
                  onClick={() => void remove(lead.id)}
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
