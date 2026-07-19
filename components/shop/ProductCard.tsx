import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="shop-card">
      <Link href={`/shop/${product.id}`} className="shop-card__link">
        <div className="shop-card__image">
          <Image src={product.image} alt={product.title} width={240} height={180} />
        </div>
        <h3 className="shop-card__title">{product.title}</h3>
        {product.code ? <p className="shop-card__code">Код: {product.code}</p> : null}
        <p className="shop-card__price">{product.price.toLocaleString('uk-UA')} ₴</p>
        <p className="shop-card__desc">{product.description}</p>
      </Link>
    </article>
  );
}