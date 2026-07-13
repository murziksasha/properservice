'use client';

import '@/styles/admin.scss';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        setError(
          res.status === 503
            ? 'ADMIN_PASSWORD не налаштовано в .env — скопіюйте з .env.example і перезапустіть сервер'
            : res.status === 429
              ? 'Забагато спроб. Зачекайте хвилину.'
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

  return (
    <div className='admin-body admin-login'>
      <form onSubmit={handleSubmit} className='admin-login-card'>
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
          />
        </label>
        {error ? (
          <p className='admin-login-error' role='alert' aria-live='assertive'>
            {error}
          </p>
        ) : null}
        <button type='submit' className='admin-btn admin-btn--block' disabled={loading}>
          {loading ? 'Вхід…' : 'Увійти'}
        </button>
      </form>
    </div>
  );
}
