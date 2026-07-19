'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { TimeFilter } from '@/lib/journal-filter';
import { matchesPhoneQuery, matchesTimeFilter } from '@/lib/journal-filter';
import { formatTelHref } from '@/lib/phone';
import { showToast } from './AdminToast';

interface LeadAudit {
  at: string;
  action: string;
  detail?: string;
}

interface Lead {
  id: string;
  phone: string;
  createdAt: string;
  source: string;
  emailed: boolean;
  handled: boolean;
  note?: string;
  pagePath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  handledAt?: string;
  audit?: LeadAudit[];
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
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [phoneQ, setPhoneQ] = useState('');
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
    return leads.filter((l) => {
      if (filter === 'open' && l.handled) return false;
      if (filter === 'done' && !l.handled) return false;
      if (!matchesTimeFilter(l.createdAt, timeFilter)) return false;
      if (!matchesPhoneQuery(l.phone, phoneQ)) return false;
      return true;
    });
  }, [leads, filter, timeFilter, phoneQ]);

  const openCount = leads.filter((l) => !l.handled).length;

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
          <Link className='admin-btn admin-btn--secondary' href='/api/leads?format=csv'>
            CSV
          </Link>
          <button type='button' className='admin-btn admin-btn--secondary' onClick={() => void load()}>
            Оновити
          </button>
        </div>
      </div>

      {loading ? <p className='admin-hint'>Завантаження…</p> : null}
      {!loading && visible.length === 0 ? <p className='admin-hint'>Немає заявок у цьому фільтрі.</p> : null}

      <ul className='admin-leads-list'>
        {visible.map((lead) => {
          const noteVal = noteDraft[lead.id] ?? lead.note ?? '';
          const busy = busyId === lead.id;
          const utm = [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ');
          return (
            <li key={lead.id} className={`admin-lead-item${lead.handled ? ' is-handled' : ''}`}>
              <div className='admin-lead-main'>
                <a className='admin-lead-phone' href={formatTelHref(lead.phone)}>
                  {lead.phone}
                </a>
                <span className='admin-lead-meta'>{formatWhen(lead.createdAt)}</span>
                <span className='admin-lead-meta'>
                  {lead.emailed ? 'email ✓' : 'без email'} · {lead.source}
                  {lead.handledAt ? ` · оброблено ${formatWhen(lead.handledAt)}` : ''}
                </span>
                {lead.pagePath ? (
                  <span className='admin-lead-meta' title={lead.pagePath}>
                    {lead.pagePath}
                  </span>
                ) : null}
                {utm ? <span className='admin-lead-meta'>UTM: {utm}</span> : null}
                {lead.audit && lead.audit.length > 0 ? (
                  <span className='admin-lead-meta' title={lead.audit.map((a) => `${a.action} ${a.at}`).join('\n')}>
                    Історія: {lead.audit.slice(-3).map((a) => a.action).join(' → ')}
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
