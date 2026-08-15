'use client';

import { useTextSize, type TextSize } from './TextSizeProvider';

const OPTIONS: Array<{ value: TextSize; label: string; aria: string }> = [
  { value: 'sm', label: 'A−', aria: 'Менший шрифт' },
  { value: 'md', label: 'A', aria: 'Звичайний шрифт' },
  { value: 'lg', label: 'A+', aria: 'Більший шрифт' },
];

export function TextSizeToggle({ className = '' }: { className?: string }) {
  const { size, setSize } = useTextSize();

  return (
    <div
      className={`text-size-toggle ${className}`.trim()}
      role='group'
      aria-label='Розмір тексту на сайті'
      title='Розмір тексту'
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type='button'
          data-size={opt.value}
          className={`text-size-toggle__btn${size === opt.value ? ' is-active' : ''}`}
          aria-label={opt.aria}
          aria-pressed={size === opt.value}
          onClick={() => setSize(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
