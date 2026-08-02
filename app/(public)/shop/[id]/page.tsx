import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicImage } from '@/components/ui/PublicImage';
import { OrderForm } from '@/components/forms/OrderForm';
import { ProductCard } from '@/components/shop/ProductCard';
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
        <div className='shop-detail__image'>
          <PublicImage
            src={gallery[0]}
            alt={product.title}
            width={480}
            height={360}
            sizes='(max-width: 768px) 100vw, 480px'
            priority
            style={{ width: '100%', height: 'auto' }}
          />
          {gallery.length > 1 ? (
            <div className='shop-detail__thumbs'>
              {gallery.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt='' className='shop-detail__thumb' loading='lazy' />
              ))}
            </div>
          ) : null}
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
