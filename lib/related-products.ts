import type { Product } from './types';

/** Related products: same category first, then other visible, exclude self. */
export function getRelatedProducts(
  products: Product[],
  current: Product,
  limit = 4,
): Product[] {
  const others = products.filter((p) => p.visible && p.id !== current.id);
  const cat = (current.category || '').trim().toLowerCase();
  const same = cat
    ? others.filter((p) => (p.category || '').trim().toLowerCase() === cat)
    : [];
  const rest = others.filter((p) => !same.includes(p));
  return [...same, ...rest].slice(0, limit);
}
