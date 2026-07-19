import type { Product } from './types';

export type ProductSort = 'manual' | 'price-asc' | 'price-desc' | 'title-asc' | 'title-desc';

export type VisibilityFilter = 'all' | 'visible' | 'hidden';

export const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'manual', label: 'За порядком каталогу' },
  { value: 'price-asc', label: 'Ціна: від дешевих' },
  { value: 'price-desc', label: 'Ціна: від дорогих' },
  { value: 'title-asc', label: 'Назва: А → Я' },
  { value: 'title-desc', label: 'Назва: Я → А' },
];

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

export function matchesProductQuery(product: Product, q: string): boolean {
  const normalized = normalizeQuery(q);
  if (!normalized) return true;
  const title = product.title.toLowerCase();
  const description = product.description.toLowerCase();
  const category = (product.category || '').toLowerCase();
  const code = (product.code || '').toLowerCase();
  return (
    title.includes(normalized) ||
    description.includes(normalized) ||
    category.includes(normalized) ||
    code.includes(normalized)
  );
}

export function matchesVisibility(product: Product, visibility: VisibilityFilter = 'all'): boolean {
  if (visibility === 'visible') return product.visible;
  if (visibility === 'hidden') return !product.visible;
  return true;
}

export function matchesCategory(product: Product, category?: string): boolean {
  const cat = category?.trim();
  if (!cat) return true;
  return (product.category || '').trim() === cat;
}

export function sortProducts<T extends Product>(items: T[], sort: ProductSort = 'manual'): T[] {
  if (sort === 'manual' || items.length < 2) return items;

  const next = [...items];
  next.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return a.price - b.price || a.title.localeCompare(b.title, 'uk');
      case 'price-desc':
        return b.price - a.price || a.title.localeCompare(b.title, 'uk');
      case 'title-asc':
        return a.title.localeCompare(b.title, 'uk');
      case 'title-desc':
        return b.title.localeCompare(a.title, 'uk');
      default:
        return 0;
    }
  });
  return next;
}

export function filterAndSortProducts(
  products: Product[],
  opts: {
    query?: string;
    sort?: ProductSort;
    visibility?: VisibilityFilter;
    category?: string;
  } = {},
): Product[] {
  const { query = '', sort = 'manual', visibility = 'all', category } = opts;
  const filtered = products.filter(
    (p) => matchesVisibility(p, visibility) && matchesCategory(p, category) && matchesProductQuery(p, query),
  );
  return sortProducts(filtered, sort);
}

export function parseProductSort(value: string | null | undefined): ProductSort {
  switch (value) {
    case 'price-asc':
    case 'price-desc':
    case 'title-asc':
    case 'title-desc':
    case 'manual':
      return value;
    default:
      return 'manual';
  }
}

/** Unique non-empty categories, stable order by first appearance then locale. */
export function collectCategories(products: Product[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const p of products) {
    const cat = (p.category || '').trim();
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);
    list.push(cat);
  }
  return list.sort((a, b) => a.localeCompare(b, 'uk'));
}

export function hasActiveCatalogParams(opts: {
  query?: string;
  sort?: ProductSort;
  category?: string;
}): boolean {
  const q = normalizeQuery(opts.query || '');
  const sort = opts.sort || 'manual';
  const category = (opts.category || '').trim();
  return Boolean(q) || sort !== 'manual' || Boolean(category);
}
