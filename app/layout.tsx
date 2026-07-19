import type { Metadata, Viewport } from 'next';
import { PwaRegister } from '@/components/PwaRegister';
import { getSiteData } from '@/lib/site-data';
import '@/styles/globals.scss';

export const viewport: Viewport = {
  themeColor: '#02a653',
};

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
    <html lang='uk'>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
