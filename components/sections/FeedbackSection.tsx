'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { FeedbackSection as FeedbackSectionType } from '@/lib/types';

export function FeedbackSection({
  section,
  reviewsUrl,
}: {
  section: FeedbackSectionType;
  reviewsUrl?: string;
}) {
  const [index, setIndex] = useState(0);
  const images = section.images.length ? section.images : ['/img/feedback/feed-1.jpg'];

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 6000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className='feedback' id='feedback'>
      <div className='feedback__wrapper wrapper'>
        {images.length > 1 ? (
          <>
            <button
              className='feedback left-arrow'
              type='button'
              aria-label='Попередній відгук'
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            >
              <Image src='/img/icons/left-arr.png' alt='' width={24} height={24} />
            </button>
            <button
              className='feedback right-arrow'
              type='button'
              aria-label='Наступний відгук'
              onClick={() => setIndex((i) => (i + 1) % images.length)}
            >
              <Image src='/img/icons/right-arr.png' alt='' width={24} height={24} />
            </button>
          </>
        ) : null}
        {images.map((src, i) => (
          <div key={src + i} className={`feedback__slider-item${i === index ? ' _flex' : ' _hide'}`}>
            <Image src={src} alt={`Відгук ${i + 1}`} width={800} height={500} />
          </div>
        ))}
        {reviewsUrl ? (
          <a
            className='_callback__btn _btn feedback-btn'
            id='feed-google'
            href={reviewsUrl}
            target='_blank'
            rel='noopener noreferrer'
          >
            {section.moreReviewsButtonText}
          </a>
        ) : null}
      </div>
    </div>
  );
}
