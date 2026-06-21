'use client';

import '@/styles/admin.scss';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        res.status === 503
          ? 'ADMIN_PASSWORD не налаштовано в .env — скопіюйте з .env.example і перезапустіть сервер'
          : 'Невірний пароль',
      );
      if (data.error && res.status === 503) console.error(data.error);
      setLoading(false);
      return;
    }

    const from = searchParams.get('from') ?? '/admin';
    router.push(from);
    router.refresh();
  }

  return (
    <div className="admin-body admin-login">
      <form onSubmit={handleSubmit}>
        <h1>Admin</h1>
        <label>
          Пароль
          <input type="password" name="password" required autoFocus />
        </label>
        {error ? <p style={{ color: '#c0392b' }}>{error}</p> : null}
        <button type="submit" className="admin-btn" disabled={loading} style={{ width: '100%' }}>
          {loading ? '...' : 'Увійти'}
        </button>
      </form>
    </div>
  );
}