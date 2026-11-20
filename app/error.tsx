'use client';

import { useEffect } from 'react';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[RootError]', error);
  }, [error]);

  return (
    <html lang='uk'>
      <body style={{ fontFamily: 'sans-serif', margin: 0, padding: '2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '4rem auto' }}>
          <h1 style={{ fontSize: '2rem', color: '#1a1a1a' }}>Сталася помилка</h1>
          <p style={{ color: '#666', lineHeight: 1.5 }}>
            Не вдалося завантажити інтерфейс. Спробуйте оновити сторінку.
          </p>
          <button
            type='button'
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#02a653',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Спробувати знову
          </button>
        </div>
      </body>
    </html>
  );
}
