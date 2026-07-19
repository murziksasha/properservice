'use client';

import { useCallback, useEffect, useState } from 'react';

interface HealthReport {
  ok: boolean;
  time: string;
  uptimeSec: number;
  dataFile: boolean;
  smtp: boolean;
  backups: { count: number; last: string | null };
  leads: { total: number; unhandled: number };
  orders?: { total: number; unhandled: number };
  uploads: { count: number; bytes: number };
  autoBackup: boolean;
  offsiteHint: string;
  telegram?: boolean;
  totp?: boolean;
  siteUrl?: boolean;
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec} с`;
  if (sec < 3600) return `${Math.floor(sec / 60)} хв`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h} год ${m} хв`;
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function HealthPanel() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const json = (await res.json()) as HealthReport;
      setHealth(json);
      setError(res.ok || json ? '' : 'Health unavailable');
    } catch {
      setError('Не вдалося опитувати /api/health');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (error && !health) {
    return <p className='admin-hint admin-login-error'>{error}</p>;
  }

  if (!health) {
    return <p className='admin-hint'>Перевірка health…</p>;
  }

  return (
    <div>
      <ul className='admin-checklist'>
        <li className={health.ok && health.dataFile ? 'is-ok' : 'is-warn'}>
          {health.dataFile ? '✓' : '!'} data/site.json {health.dataFile ? 'доступний' : 'відсутній'}
        </li>
        <li className='is-info'>Uptime процесу: {formatUptime(health.uptimeSec)}</li>
        <li className={health.smtp ? 'is-ok' : 'is-warn'}>
          {health.smtp ? '✓' : '!'} SMTP {health.smtp ? 'налаштовано' : '— заявки лише в журналі'}
        </li>
        <li className={health.telegram ? 'is-ok' : 'is-info'}>
          {health.telegram ? '✓' : '·'} Telegram notify{' '}
          {health.telegram ? 'увімкнено' : '— TELEGRAM_BOT_TOKEN / CHAT_ID'}
        </li>
        <li className={health.totp ? 'is-ok' : 'is-info'}>
          {health.totp ? '✓' : '·'} 2FA TOTP {health.totp ? 'увімкнено' : 'вимкнено'}
        </li>
        <li className={health.siteUrl ? 'is-ok' : 'is-warn'}>
          {health.siteUrl ? '✓' : '!'} SITE_URL {health.siteUrl ? 'задано' : '— для sitemap/OG'}
        </li>
        <li className={health.backups.count > 0 ? 'is-ok' : 'is-warn'}>
          {health.backups.count > 0 ? '✓' : '!'} Backups: {health.backups.count}
          {health.backups.last
            ? ` · останній ${new Date(health.backups.last).toLocaleString('uk-UA')}`
            : ''}
        </li>
        <li className={health.autoBackup ? 'is-ok' : 'is-info'}>
          AUTO_BACKUP {health.autoBackup ? 'увімкнено' : 'вимкнено'}
        </li>
        <li className='is-info'>
          Uploads: {health.uploads.count} ({formatBytes(health.uploads.bytes)})
        </li>
        <li className={health.leads.unhandled > 0 ? 'is-warn' : 'is-ok'}>
          Заявки: {health.leads.unhandled} нових / {health.leads.total} усього
        </li>
        <li
          className={
            (health.orders?.unhandled ?? 0) > 0 ? 'is-warn' : 'is-ok'
          }
        >
          Замовлення: {health.orders?.unhandled ?? 0} нових / {health.orders?.total ?? 0} усього
        </li>
      </ul>
      <p className='admin-hint admin-offsite-hint'>
        <strong>Off-site backup:</strong> {health.offsiteHint}
      </p>
      <div className='admin-row admin-mb'>
        <button
          type='button'
          className='admin-btn admin-btn--secondary'
          onClick={async () => {
            try {
              const res = await fetch('/api/smtp-test', { method: 'POST' });
              const j = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
              if (!res.ok) {
                alert(j.error || 'SMTP тест не вдався');
                return;
              }
              alert(`Тестовий лист надіслано на ${j.to || 'MAIL_TO'}`);
            } catch {
              alert('Мережева помилка');
            }
          }}
        >
          Тест SMTP
        </button>
      </div>
      <p className='admin-hint'>
        Оновлено: {new Date(health.time).toLocaleTimeString('uk-UA')} ·{' '}
        <button type='button' className='admin-link-btn' onClick={() => void load()}>
          оновити зараз
        </button>
      </p>
    </div>
  );
}
