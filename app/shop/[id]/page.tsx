import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/layout/SiteShell';
import { OrderForm } from '@/components/forms/OrderForm';
import { formatTelHref } from '@/lib/phone';
import { getProduct, getSiteData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product || !product.visible) {
    return { title: 'Товар не знайдено' };
  }
  const title = product.title;
  const description = product.description || product.title;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: product.image ? [{ url: product.image }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const [data, product] = await Promise.all([getSiteData(), getProduct(id)]);

  if (!product || !product.visible) {
    notFound();
  }

  const menu = data.headerMenu.filter((item) => item.visible);
  const viber = data.settings.social.find((s) => s.type === 'viber');
  const telegram = data.settings.social.find((s) => s.type === 'telegram');
  const socialLabel: Record<string, string> = {
    viber: 'Viber',
    telegram: 'Telegram',
    instagram: 'Instagram',
    youtube: 'YouTube',
  };

  return (
    <SiteShell settings={data.settings} menu={menu} variant='inner'>
      <article className='shop-detail wrapper'>
        <Link href='/shop' className='shop-detail__back'>
          ← Усі товари
        </Link>
        <div className='shop-detail__grid'>
          <div className='shop-detail__image'>
            <Image
              src={product.image}
              alt={product.title}
              width={480}
              height={360}
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          <div className='shop-detail__info'>
            <h1 className='shop-detail__title _title'>{product.title}</h1>
            {product.code ? <p className='shop-detail__code'>Код: {product.code}</p> : null}
            <p className='shop-detail__price'>{product.price.toLocaleString('uk-UA')} ₴</p>
            <p className='shop-detail__desc _paragr'>{product.description}</p>
            <div className='shop-detail__actions'>
              <a href={formatTelHref(data.settings.headerPhone.tel)} className='_btn'>
                Зателефонувати
              </a>
              {viber ? (
                <a href={viber.url} className='_btn' target='_blank' rel='noopener noreferrer'>
                  {socialLabel.viber}
                </a>
              ) : null}
              {telegram ? (
                <a href={telegram.url} className='_btn' target='_blank' rel='noopener noreferrer'>
                  {socialLabel.telegram}
                </a>
              ) : null}
            </div>
            <OrderForm productId={product.id} productTitle={product.title} />
          </div>
        </div>
      </article>
    </SiteShell>
  );
}
