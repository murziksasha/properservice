'use client';

import {
  formatCountdown,
  parseRetryAfterFromBody,
  rateLimitMessage,
} from '@/lib/admin/rateLimitUi';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    setError(rateLimitMessage(lockSeconds, 'login'));
    const id = window.setTimeout(() => {
      setLockSeconds((s) => {
        const next = s - 1;
        if (next <= 0) {
          setError('');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearTimeout(id);
  }, [lockSeconds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lockSeconds > 0 || loading) return;

    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'same-origin',
      });

      if (!res.ok) {
        if (res.status === 429) {
          const seconds = await parseRetryAfterFromBody(res, 60);
          setLockSeconds(seconds);
          setError(rateLimitMessage(seconds, 'login'));
          setLoading(false);
          return;
        }
        setError(
          res.status === 503
            ? 'ADMIN_PASSWORD не налаштовано в .env — скопіюйте з .env.example і перезапустіть сервер'
            : res.status === 403
              ? 'Доступ заборонено з цієї IP-адреси'
              : 'Невірний пароль',
        );
        setLoading(false);
        return;
      }

      // Full navigation so the browser always sends the new session cookie
      const from = searchParams.get('from') || '/admin';
      const target = from.startsWith('/admin') ? from : '/admin';
      window.location.assign(target);
    } catch {
      setError('Помилка мережі. Спробуйте ще раз.');
      setLoading(false);
    }
  }

  const locked = lockSeconds > 0;

  return (
    <div className='admin-body admin-login'>
      <form onSubmit={handleSubmit} className='admin-login-card' aria-busy={loading}>
        <div className='admin-login-brand'>Proper Service</div>
        <h1>Вхід до адмінки</h1>
        <label htmlFor='admin-password'>
          Пароль
          <input
            id='admin-password'
            type='password'
            name='password'
            required
            autoFocus
            autoComplete='current-password'
            disabled={loading || locked}
          />
        </label>
        {error ? (
          <p className='admin-login-error' role='alert' aria-live='assertive'>
            {error}
          </p>
        ) : null}
        {locked ? (
          <p className='admin-login-lock' role='status' aria-live='polite'>
            Повтор через <strong>{formatCountdown(lockSeconds)}</strong>
          </p>
        ) : null}
        <button
          type='submit'
          className='admin-btn admin-btn--block'
          disabled={loading || locked}
        >
          {loading ? 'Вхід…' : locked ? `Заблоковано (${formatCountdown(lockSeconds)})` : 'Увійти'}
        </button>
      </form>
    </div>
  );
}
