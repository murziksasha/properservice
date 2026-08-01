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

/** Sentinel for products without a category (admin filter + group key). */
export const UNCATEGORIZED_KEY = '__none__';

export const UNCATEGORIZED_LABEL = 'Без категорії';

export function productCategoryKey(product: Product): string {
  const cat = (product.category || '').trim();
  return cat || UNCATEGORIZED_KEY;
}

export function matchesCategory(product: Product, category?: string): boolean {
  const cat = category?.trim();
  if (!cat) return true;
  if (cat === UNCATEGORIZED_KEY) return !(product.category || '').trim();
  return (product.category || '').trim() === cat;
}

export type ProductCategoryGroup<T extends Product = Product> = {
  /** Category name, or `UNCATEGORIZED_KEY` for empty. */
  key: string;
  /** Display label (Ukrainian for uncategorized). */
  label: string;
  products: T[];
  total: number;
  visibleCount: number;
};

/**
 * Group products by category in **first-seen** catalog order.
 * Uncategorized bucket (if any) is always last.
 */
export function groupProductsByCategory<T extends Product>(
  products: T[],
  opts: { localeSortCategories?: boolean } = {},
): ProductCategoryGroup<T>[] {
  const map = new Map<string, T[]>();
  const order: string[] = [];

  for (const p of products) {
    const key = productCategoryKey(p);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(p);
  }

  let keys = order.filter((k) => k !== UNCATEGORIZED_KEY);
  if (opts.localeSortCategories) {
    keys = [...keys].sort((a, b) => a.localeCompare(b, 'uk'));
  }
  if (map.has(UNCATEGORIZED_KEY)) keys.push(UNCATEGORIZED_KEY);

  return keys.map((key) => {
    const list = map.get(key) || [];
    return {
      key,
      label: key === UNCATEGORIZED_KEY ? UNCATEGORIZED_LABEL : key,
      products: list,
      total: list.length,
      visibleCount: list.filter((x) => x.visible).length,
    };
  });
}

/** Rename a category string across goods (empty `to` → uncategorized). */
export function renameCategoryInGoods<T extends Product>(goods: T[], from: string, to: string): T[] {
  const fromTrim = from.trim();
  const toTrim = to.trim();
  if (!fromTrim || fromTrim === toTrim) return goods;
  return goods.map((g) => {
    const cat = (g.category || '').trim();
    if (cat !== fromTrim) return g;
    return { ...g, category: toTrim || undefined };
  });
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
