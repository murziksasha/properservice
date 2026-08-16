import Link from 'next/link';
import { ShopCatalog } from '@/components/shop/ShopCatalog';
import { formatTelHref } from '@/lib/phone';
import { getProducts, getSiteData } from '@/lib/site-data';
import { parseProductSort } from '@/lib/shop-catalog';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const data = await getSiteData();
  const description = data.settings.description || 'Каталог товарів Proper Service';
  return {
    title: 'Магазин',
    description,
    openGraph: {
      title: 'Магазин | Proper Service',
      description,
      type: 'website',
    },
  };
}

interface PageProps {
  searchParams: Promise<{ q?: string; sort?: string; category?: string }>;
}

const SOCIAL_LABELS: Record<string, string> = {
  viber: 'Viber',
  telegram: 'Telegram',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

export default async function ShopPage({ searchParams }: PageProps) {
  const [data, products, sp] = await Promise.all([getSiteData(), getProducts(), searchParams]);
  const initialQuery = typeof sp.q === 'string' ? sp.q : '';
  const initialSort = parseProductSort(typeof sp.sort === 'string' ? sp.sort : undefined);
  const initialCategory = typeof sp.category === 'string' ? sp.category : '';

  return (
    <section className='shop-page wrapper'>
      <h1 className='shop-page__title _title'>Магазин</h1>
      <p className='shop-page__subtitle _paragr'>
        Каталог товарів. Для замовлення зателефонуйте або напишіть у месенджер.
      </p>

      <ShopCatalog
        products={products}
        initialQuery={initialQuery}
        initialSort={initialSort}
        initialCategory={initialCategory}
      />

      <p className='shop-page__contact'>
        <a href={formatTelHref(data.settings.headerPhone.tel)} className='_btn'>
          Замовити: {data.settings.headerPhone.display}
        </a>
      </p>
      <div className='shop-page__messengers'>
        {data.settings.social.map(link => (
          <a key={link.id} href={link.url} target='_blank' rel='noopener noreferrer' className='shop-page__social'>
            {SOCIAL_LABELS[link.type] || link.type}
          </a>
        ))}
      </div>
      <p className='shop-page__home'>
        <Link href='/'>← На головну</Link>
      </p>
    </section>
  );
}
