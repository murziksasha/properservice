import Script from 'next/script';
import type { MenuItem, SiteSettings } from '@/lib/types';
import { FaqJsonLd } from '@/components/seo/FaqJsonLd';
import { LocalBusinessJsonLd } from '@/components/seo/LocalBusinessJsonLd';
import { Footer } from './Footer';
import { Header } from './Header';
import { PageUp } from './PageUp';
import { StickyCallBar } from './StickyCallBar';

interface SiteShellProps {
  settings: SiteSettings;
  menu: MenuItem[];
  variant?: 'home' | 'inner';
  children: React.ReactNode;
  titleSize?: number;
  textScale?: number;
}

export function SiteShell({ settings, menu, variant = 'home', children, titleSize, textScale }: SiteShellProps) {
  const style: React.CSSProperties & Record<string, string | number> = {};
  if (titleSize) style['--title-size'] = `${titleSize}rem`;
  if (textScale) style['--text-scale'] = String(textScale);
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '') || undefined;
  const gincore = process.env.GINCORE_WIDGETS !== 'false';

  return (
    <div className='container' id='up' style={style}>
      <LocalBusinessJsonLd settings={settings} siteUrl={siteUrl} />
      {variant === 'home' ? <FaqJsonLd /> : null}
      <a className='skip-link' href='#main-content'>
        Перейти до вмісту
      </a>
      <Header settings={settings} menu={menu} variant={variant} />
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
