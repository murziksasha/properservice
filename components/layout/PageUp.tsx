'use client';

import { useEffect, useState } from 'react';

export function PageUp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTop() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  return (
    <button
      type='button'
      className={`pageup${visible ? '' : ' _hide'}`}
      onClick={scrollTop}
      aria-label='Вгору'
      tabIndex={visible ? 0 : -1}
    >
      <svg className='up' viewBox='0 0 26 26' fill='#fff' xmlns='http://www.w3.org/2000/svg' aria-hidden>
        <path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M26 0H0V26H26V0ZM4.6593 17.7519L13.1233 10.33L21.5873 17.7519L22.9059 16.2481L13.7826 8.24813L13.1233 7.67L12.464 8.24813L3.3407 16.2481L4.6593 17.7519Z'
          fill='black'
        />
      </svg>
    </button>
  );
}
