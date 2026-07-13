import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/layout/SiteShell';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { sanitizeHtml } from '@/lib/sanitize';
import { getSiteData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const data = await getSiteData();
  return data.pages
    .filter((page) => page.slug && page.visible)
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const data = await getSiteData();
  const page = data.pages.find((p) => p.slug === slug && p.visible);
  if (!page) return {};
  return { title: page.title, description: page.description };
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getSiteData();
  const page = data.pages.find((p) => p.slug === slug && p.visible);

  if (!page) {
    notFound();
  }

  const menu = data.headerMenu.filter((item) => item.visible);

  if (page.contentHtml) {
    return (
      <SiteShell
        settings={data.settings}
        menu={menu}
        variant="inner"
        titleSize={page.titleSize}
        textScale={page.textScale}
      >
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.contentHtml) }} />
      </SiteShell>
    );
  }

  return (
    <SiteShell
      settings={data.settings}
      menu={menu}
      variant="inner"
      titleSize={page.titleSize}
      textScale={page.textScale}
    >
      <SectionRenderer
        sections={page.sections}
        servicesNav={data.servicesNav}
        products={data.goods.filter((g) => g.visible)}
        reviewsUrl={data.settings.reviewsUrl}
      />
    </SiteShell>
  );
}