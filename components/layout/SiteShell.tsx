import Script from 'next/script';
import type { MenuItem, SiteSettings } from '@/lib/types';
import { Footer } from './Footer';
import { Header } from './Header';
import { PageUp } from './PageUp';

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

  return (
    <div className='container' id='up' style={style}>
      <a className='skip-link' href='#main-content'>
        Перейти до вмісту
      </a>
      <Header settings={settings} menu={menu} variant={variant} />
      <main className='main' id='main-content'>
        {children}
      </main>
      <PageUp />
      <Footer settings={settings} />
      <Script src='//remontservice.gincore.net/widget.php?ajax=&w=state&jquery=0' strategy='lazyOnload' />
      <Script src='//remontservice.gincore.net/widget.php?ajax=&w=feedback&jquery=0' strategy='lazyOnload' />
    </div>
  );
}
