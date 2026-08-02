'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, type CSSProperties } from 'react';

export type PublicImageProps = Omit<ImageProps, 'onLoad' | 'onLoadingComplete'> & {
  /** Soft background while decoding (defaults on). Avoids clash with next/image `placeholder`. */
  softPlaceholder?: boolean;
  /** Extra class on the outer wrapper. */
  wrapperClassName?: string;
  /** Named view-transition element (e.g. service-hero). */
  viewTransitionName?: string;
};

function srcKey(src: ImageProps['src']): string {
  if (typeof src === 'string') return src;
  if (src && typeof src === 'object' && 'src' in src) return String(src.src);
  return '';
}

/**
 * Public-site image with reserved box, soft reveal after decode, and optional
 * view-transition name. Priority images stay visible immediately (LCP-safe).
 *
 * Loaded state is keyed by `src` so we never reset after onLoad (a useEffect
 * reset was leaving opacity:0 forever on cached / fast loads).
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
  const key = srcKey(src);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loaded = loadedKey === key;

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
        onLoad={() => setLoadedKey(key)}
        onLoadingComplete={() => setLoadedKey(key)}
      />
    </span>
  );
}
