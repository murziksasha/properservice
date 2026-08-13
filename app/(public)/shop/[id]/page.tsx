import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderForm } from '@/components/forms/OrderForm';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { formatTelHref } from '@/lib/phone';
import { getRelatedProducts } from '@/lib/related-products';
import { getProduct, getProducts, getSiteData } from '@/lib/site-data';

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
  const images = [product.image, ...(product.images || [])].filter(Boolean);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: images.slice(0, 4).map((url) => ({ url })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const [data, product, allProducts] = await Promise.all([
    getSiteData(),
    getProduct(id),
    getProducts(),
  ]);

  if (!product || !product.visible) {
    notFound();
  }

  const viber = data.settings.social.find((s) => s.type === 'viber');
  const telegram = data.settings.social.find((s) => s.type === 'telegram');
  const gallery = [product.image, ...(product.images || []).filter((u) => u && u !== product.image)];
  const related = getRelatedProducts(allProducts, product, 4);

  return (
    <article className='shop-detail wrapper'>
      <Link href='/shop' className='shop-detail__back'>
        ← Усі товари
      </Link>
      <div className='shop-detail__grid'>
        <ProductGallery images={gallery} alt={product.title} />
        <div className='shop-detail__info'>
          <h1 className='shop-detail__title _title'>{product.title}</h1>
          {product.code ? <p className='shop-detail__code'>Код: {product.code}</p> : null}
          <p className='shop-detail__price'>{product.price.toLocaleString('uk-UA')} ₴</p>
          <p className='shop-detail__desc _paragr'>{product.description}</p>
          {product.video ? (
            <div className='shop-detail__video'>
              <h2 className='shop-detail__video-title'>Огляд</h2>
              <video
                className='shop-detail__video-el'
                src={product.video}
                controls
                playsInline
                preload='metadata'
              />
            </div>
          ) : null}
          <div className='shop-detail__actions'>
            <a href={formatTelHref(data.settings.headerPhone.tel)} className='_btn'>
              Зателефонувати
            </a>
            {viber ? (
              <a href={viber.url} className='_btn' target='_blank' rel='noopener noreferrer'>
                Viber
              </a>
            ) : null}
            {telegram ? (
              <a href={telegram.url} className='_btn' target='_blank' rel='noopener noreferrer'>
                Telegram
              </a>
            ) : null}
          </div>
          <OrderForm productId={product.id} productTitle={product.title} />
        </div>
      </div>

      {related.length > 0 ? (
        <section className='shop-related' aria-label='Схожі товари'>
          <h2 className='_title shop-related__title'>Схожі товари</h2>
          <div className='shop-grid'>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
