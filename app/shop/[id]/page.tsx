import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/layout/SiteShell';
import { CallbackForm } from '@/components/forms/CallbackForm';
import { getProduct, getSiteData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product || !product.visible) return {};
  return { title: product.title, description: product.description };
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

  return (
    <SiteShell settings={data.settings} menu={menu} variant="inner">
      <article className="shop-detail wrapper">
        <Link href="/shop" className="shop-detail__back">← Усі товари</Link>
        <div className="shop-detail__grid">
          <div className="shop-detail__image">
            <Image src={product.image} alt={product.title} width={480} height={360} style={{ width: '100%', height: 'auto' }} />
          </div>
          <div className="shop-detail__info">
            <h1 className="shop-detail__title _title">{product.title}</h1>
            <p className="shop-detail__price">{product.price.toLocaleString('uk-UA')} ₴</p>
            <p className="shop-detail__desc _paragr">{product.description}</p>
            <div className="shop-detail__actions">
              <a href={`tel:${data.settings.headerPhone.tel}`} className="_btn">
                Зателефонувати
              </a>
              {viber ? (
                <a href={viber.url} className="_btn" target="_blank" rel="noreferrer">Viber</a>
              ) : null}
              {telegram ? (
                <a href={telegram.url} className="_btn" target="_blank" rel="noreferrer">Telegram</a>
              ) : null}
            </div>
            <div style={{ marginTop: 32 }}>
              <p className="_paragr">Або залиште заявку:</p>
              <CallbackForm buttonText="залишити заявку" />
            </div>
          </div>
        </div>
      </article>
    </SiteShell>
  );
}