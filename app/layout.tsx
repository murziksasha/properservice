import type { Metadata } from 'next';
import { getSiteData } from '@/lib/site-data';
import '@/styles/globals.scss';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  return {
    title: data.settings.title,
    description: data.settings.description,
    icons: { icon: data.settings.favicon },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}