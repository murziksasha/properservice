'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { FeedbackSection as FeedbackSectionType } from '@/lib/types';

export function FeedbackSection({ section }: { section: FeedbackSectionType }) {
  const [index, setIndex] = useState(0);
  const images = section.images;

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 6000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="feedback" id="feedback">
      <div className="feedback__wrapper wrapper">
        <button className="feedback left-arrow" type="button" onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}>
          <Image src="/img/icons/left-arr.png" alt="arrow" width={24} height={24} />
        </button>
        <button className="feedback right-arrow" type="button" onClick={() => setIndex((i) => (i + 1) % images.length)}>
          <Image src="/img/icons/right-arr.png" alt="arrow" width={24} height={24} />
        </button>
        {images.map((src, i) => (
          <div key={src} className={`feedback__slider-item${i === index ? ' _flex' : ' _hide'}`}>
            <Image src={src} alt="feedback" width={800} height={500} />
          </div>
        ))}
        <button className="_callback__btn _btn feedback-btn" id="feed-google" type="button">
          {section.moreReviewsButtonText}
        </button>
      </div>
    </div>
  );
}