'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState, type CSSProperties } from 'react';

export type PublicImageProps = Omit<ImageProps, 'onLoad' | 'onLoadingComplete'> & {
  /** Soft background while decoding (defaults on). Avoids clash with next/image `placeholder`. */
  softPlaceholder?: boolean;
  /** Extra class on the outer wrapper. */
  wrapperClassName?: string;
  /** Named view-transition element (e.g. service-hero). */
  viewTransitionName?: string;
};

/**
 * Public-site image with reserved box, soft reveal after decode, and optional
 * view-transition name. Priority images stay visible immediately (LCP-safe).
 */
export function PublicImage({
  className,
  wrapperClassName,
  softPlaceholder = true,
  viewTransitionName,
  priority,
  src,
  alt,
  ...rest
}: PublicImageProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const wrapClass = [
    'ps-image',
    softPlaceholder ? 'ps-image--placeholder' : '',
    loaded || priority ? 'is-ready' : '',
    wrapperClassName || '',
  ]
    .filter(Boolean)
    .join(' ');

  const imgClass = ['ps-image__img', loaded ? 'is-loaded' : '', priority ? 'is-priority' : '', className || '']
    .filter(Boolean)
    .join(' ');

  const style: CSSProperties | undefined = viewTransitionName
    ? ({ viewTransitionName } as CSSProperties)
    : undefined;

  return (
    <span className={wrapClass} style={style}>
      <Image
        {...rest}
        src={src}
        alt={alt}
        priority={priority}
        className={imgClass}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
