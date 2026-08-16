import type { Metadata, Viewport } from 'next';
import { PwaRegister } from '@/components/PwaRegister';
import { TextSizeProvider } from '@/components/layout/TextSizeProvider';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { getSiteData } from '@/lib/site-data';
import '@/styles/globals.scss';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#02a653' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1f18' },
  ],
};

/** Runs before paint to avoid light flash when user prefers dark / text size. */
const THEME_BOOT =
  "(function(){try{var r=document.documentElement;var k='ps-theme';var p=localStorage.getItem(k)||'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='dark'||(p!=='light'&&d)?'dark':'light';r.dataset.theme=t;r.style.colorScheme=t;var ts=localStorage.getItem('ps-text-size')||localStorage.getItem('ps-shop-text-size')||'md';if(ts==='sm'||ts==='md'||ts==='lg')r.dataset.textSize=ts;}catch(e){}})();";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  const title = data.settings.title;
  const description = data.settings.description;
  const base = process.env.SITE_URL?.replace(/\/$/, '') || undefined;

  return {
    metadataBase: base ? new URL(base) : undefined,
    title: {
      default: title,
      template: `%s | Proper Service`,
    },
    description,
    icons: { icon: data.settings.favicon },
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Proper Service',
    },
    openGraph: {
      type: 'website',
      locale: 'uk_UA',
      title,
      description,
      siteName: 'Proper Service',
      images: [
        {
          url: data.settings.logo || '/img/icons/logo.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [data.settings.logo || '/img/icons/logo.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='uk' suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <ThemeProvider>
          <TextSizeProvider>
            {children}
            <PwaRegister />
          </TextSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
