'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[PublicError]', error);
  }, [error]);

  return (
    <section className='not-found wrapper' role='alert' aria-live='assertive'>
      <p className='not-found__code'>500</p>
      <h1 className='not-found__title _title'>Щось пішло не так</h1>
      <p className='not-found__text _paragr'>
        Сталася помилка при завантаженні сторінки. Спробуйте оновити або поверніться на головну.
      </p>
      <div className='not-found__actions'>
        <button className='_btn' type='button' onClick={() => reset()}>
          Спробувати знову
        </button>
        <Link href='/' className='_btn'>
          На головну
        </Link>
      </div>
    </section>
  );
}
