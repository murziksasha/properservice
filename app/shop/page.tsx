import Link from 'next/link';
import { SiteShell } from '@/components/layout/SiteShell';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { getProducts, getSiteData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: 'Магазин' };
}

export default async function ShopPage() {
  const [data, products] = await Promise.all([getSiteData(), getProducts()]);
  const menu = data.headerMenu.filter((item) => item.visible);

  return (
    <SiteShell settings={data.settings} menu={menu} variant="inner">
      <section className="shop-page wrapper">
        <h1 className="shop-page__title _title">Магазин</h1>
        <p className="shop-page__subtitle _paragr">
          Каталог товарів. Для замовлення зателефонуйте або напишіть у месенджер.
        </p>
        <ProductGrid products={products} />
        <p className="shop-page__contact" style={{ marginTop: 32, textAlign: 'center' }}>
          <a href={`tel:${data.settings.headerPhone.tel}`} className="_btn">
            Замовити: {data.settings.headerPhone.display}
          </a>
        </p>
        <p style={{ textAlign: 'center', marginTop: 12 }}>
          <Link href="/">На головну</Link>
        </p>
      </section>
    </SiteShell>
  );
}