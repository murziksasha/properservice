import { SiteShell } from '@/components/layout/SiteShell';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { getSiteData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getSiteData();
  const page = data.pages.find((p) => p.slug === '' && p.visible)
    ?? data.pages.find((p) => p.id === 'home');

  if (!page) {
    return <p>Сторінку не знайдено</p>;
  }

  const menu = data.headerMenu.filter((item) => item.visible);

  return (
    <SiteShell
      settings={data.settings}
      menu={menu}
      variant="home"
      titleSize={page.titleSize}
      textScale={page.textScale}
    >
      <SectionRenderer
        sections={page.sections}
        servicesNav={data.servicesNav}
        products={data.goods.filter((g) => g.visible)}
        reviewsUrl={data.settings.reviewsUrl}
        settings={data.settings}
      />
    </SiteShell>
  );
}