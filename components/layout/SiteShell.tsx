import Script from 'next/script';
import type { MenuItem, SiteSettings } from '@/lib/types';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { Footer } from './Footer';
import { Header } from './Header';
import { PageUp } from './PageUp';
import { StickyCallBar } from './StickyCallBar';

interface SiteShellProps {
  settings: SiteSettings;
  menu: MenuItem[];
  children: React.ReactNode;
}

/**
 * Stable public chrome (header / footer / sticky). Prefer wrapping once in
 * `app/(public)/layout.tsx` so it does not remount between navigations.
 */
export function SiteShell({ settings, menu, children }: SiteShellProps) {
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '') || undefined;
  const gincore = process.env.GINCORE_WIDGETS !== 'false';

  return (
    <div className='container' id='up'>
      <LocalBusinessJsonLd settings={settings} siteUrl={siteUrl} />
      <a className='skip-link' href='#main-content'>
        Перейти до вмісту
      </a>
      <Header settings={settings} menu={menu} />
      <main className='main' id='main-content'>
        {children}
      </main>
      <PageUp />
      <Footer settings={settings} />
      <StickyCallBar settings={settings} />
      {gincore ? (
        <>
          <Script
            src='https://remontservice.gincore.net/widget.php?ajax=&w=state&jquery=0'
            strategy='lazyOnload'
          />
          <Script
            src='https://remontservice.gincore.net/widget.php?ajax=&w=feedback&jquery=0'
            strategy='lazyOnload'
          />
        </>
      ) : null}
    </div>
  );
}

/** Per-page CSS scale vars (title size / body text) without remounting chrome. */
export function PageFrame({
  titleSize,
  textScale,
  children,
}: {
  titleSize?: number;
  textScale?: number;
  children: React.ReactNode;
}) {
  const style: React.CSSProperties & Record<string, string | number> = {};
  if (titleSize) style['--title-size'] = `${titleSize}rem`;
  if (textScale) style['--text-scale'] = String(textScale);
  if (!titleSize && !textScale) return <>{children}</>;
  return <div style={style}>{children}</div>;
}
