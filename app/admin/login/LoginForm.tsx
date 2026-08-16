'use client';

import {
  formatCountdown,
  parseRetryAfterFromBody,
  rateLimitMessage,
} from '@/lib/admin/rateLimitUi';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width='20' height='20' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
        <path
          d='M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.4 10.4 0 0112 5c5 0 9.3 3.1 11 7.5a11.7 11.7 0 01-4.2 5.1M6.1 6.1A11.7 11.7 0 001 12.5C2.7 16.9 7 20 12 20c1.6 0 3.1-.3 4.5-.9'
          stroke='currentColor'
          strokeWidth='1.8'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    );
  }
  return (
    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <path
        d='M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5c-1.7 4.4-6 7.5-11 7.5S2.7 16.9 1 12.5z'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinejoin='round'
      />
      <circle cx='12' cy='12.5' r='3' stroke='currentColor' strokeWidth='1.8' />
    </svg>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [needTotp, setNeedTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    const username = String(formData.get('username') ?? '');
    const totp = String(formData.get('totp') ?? '');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          username: username || undefined,
          totp: totp || undefined,
        }),
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
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          needTotp?: boolean;
        };
        if (json.needTotp) setNeedTotp(true);
        setError(
          res.status === 503
            ? 'ADMIN_PASSWORD не налаштовано в .env — скопіюйте з .env.example і перезапустіть сервер'
            : res.status === 403
              ? 'Доступ заборонено з цієї IP-адреси'
              : json.needTotp
                ? 'Потрібен код 2FA (TOTP)'
                : json.error === 'Invalid 2FA code'
                  ? 'Невірний код 2FA'
                  : 'Невірний пароль',
        );
        setLoading(false);
        return;
      }

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
      <form
        onSubmit={handleSubmit}
        className='admin-login-card admin-form'
        aria-busy={loading}
      >
        <div className='admin-login-brand'>Proper Service</div>
        <h1>Вхід до адмінки</h1>
        <label htmlFor='admin-username'>
          Логін{' '}
          <span className='admin-login-optional'>(опційно, multi-user)</span>
          <input
            id='admin-username'
            name='username'
            type='text'
            autoComplete='username'
            disabled={loading || locked}
          />
        </label>
        <label htmlFor='admin-password'>
          Пароль
          <div className='admin-password-field'>
            <input
              id='admin-password'
              type={showPassword ? 'text' : 'password'}
              name='password'
              required
              autoFocus
              autoComplete='current-password'
              disabled={loading || locked}
              className='admin-password-field__input'
            />
            <button
              type='button'
              className='admin-password-field__toggle'
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
              aria-pressed={showPassword}
              disabled={loading || locked}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </label>
        <label htmlFor='admin-totp'>
          Код 2FA {needTotp ? '(обовʼязково)' : '(якщо увімкнено)'}
          <input
            id='admin-totp'
            type='text'
            name='totp'
            inputMode='numeric'
            autoComplete='one-time-code'
            pattern='[0-9]*'
            maxLength={6}
            placeholder='000000'
            disabled={loading || locked}
          />
        </label>
        <p className='admin-hint admin-login-2fa-hint'>
          2FA: <strong>Налаштування → Безпека</strong> (QR) або{' '}
          <code>ADMIN_TOTP_SECRET</code> у <code>.env</code>
        </p>
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
        <button type='submit' className='admin-btn admin-btn--block' disabled={loading || locked}>
          {loading ? 'Вхід…' : locked ? `Заблоковано (${formatCountdown(lockSeconds)})` : 'Увійти'}
        </button>
      </form>
    </div>
  );
}
