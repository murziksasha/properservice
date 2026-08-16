import type { SiteSettings } from '@/lib/types';
import { formatTelHref } from '@/lib/phone';

interface StickyCallBarProps {
  settings: SiteSettings;
}

/**
 * Mobile sticky call-to-action — high conversion for repair service.
 */
export function StickyCallBar({ settings }: StickyCallBarProps) {
  const phone = settings.headerPhone;
  if (!phone?.tel || !phone.display) return null;

  const telHref = formatTelHref(phone.tel);
  const viber = settings.social?.find(s => s.type === 'viber');
  const telegram = settings.social?.find(s => s.type === 'telegram');

  return (
    <div className='sticky-call' role='region' aria-label='Швидкий дзвінок'>
      <a className='sticky-call__phone' href={telHref}>
        <span className='sticky-call__label'>Зателефонувати</span>
        <span className='sticky-call__num'>{phone.display}</span>
      </a>
      <div className='sticky-call__messengers'>
        {viber?.url ? (
          <a
            className='sticky-call__msg sticky-call__msg--viber'
            href={viber.url}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Написати у Viber'
          >
            Viber
          </a>
        ) : null}
        {telegram?.url ? (
          <a
            className='sticky-call__msg sticky-call__msg--tg'
            href={telegram.url}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='Написати у Telegram'
          >
            Telegram
          </a>
        ) : null}
      </div>
    </div>
  );
}
