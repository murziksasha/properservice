import { describe, expect, it } from 'vitest';
import type { Product } from './types';
import {
  collectCategories,
  filterAndSortProducts,
  hasActiveCatalogParams,
  matchesProductQuery,
  normalizeQuery,
  parseProductSort,
  sortProducts,
} from './shop-catalog';

function p(partial: Partial<Product> & Pick<Product, 'id' | 'title' | 'price'>): Product {
  return {
    description: '',
    image: '/x.png',
    visible: true,
    ...partial,
  };
}

const sample: Product[] = [
  p({ id: '1', title: 'Екран iPhone', price: 1200, description: 'Оригінал', category: 'Телефони' }),
  p({ id: '2', title: 'Блок живлення', price: 350, description: 'TV / монітор', category: 'ТВ', visible: false }),
  p({ id: '3', title: 'Акумулятор', price: 800, description: 'для телефону', category: 'Телефони' }),
  p({ id: '4', title: 'Клавіатура', price: 350, description: 'USB', category: 'Ноутбуки' }),
];

describe('normalizeQuery', () => {
  it('trims and lowercases', () => {
    expect(normalizeQuery('  Тест  ')).toBe('тест');
  });
});

describe('matchesProductQuery', () => {
  it('matches title, description, category', () => {
    expect(matchesProductQuery(sample[0], 'iphone')).toBe(true);
    expect(matchesProductQuery(sample[0], 'Ориг')).toBe(true);
    expect(matchesProductQuery(sample[0], 'телефон')).toBe(true);
    expect(matchesProductQuery(sample[0], 'xyz')).toBe(false);
  });

  it('empty query matches all', () => {
    expect(matchesProductQuery(sample[0], '  ')).toBe(true);
  });
});

describe('sortProducts', () => {
  it('keeps manual order', () => {
    expect(sortProducts(sample, 'manual').map((x) => x.id)).toEqual(['1', '2', '3', '4']);
  });

  it('sorts by price asc/desc with title tie-break', () => {
    const asc = sortProducts(sample, 'price-asc').map((x) => x.id);
    expect(asc[0]).toBe('2'); // 350 Блок
    expect(asc[1]).toBe('4'); // 350 Клавіатура (locale after Блок)
    expect(sortProducts(sample, 'price-desc')[0].price).toBe(1200);
  });

  it('sorts by title', () => {
    const titles = sortProducts(sample, 'title-asc').map((x) => x.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'uk')));
  });
});

describe('filterAndSortProducts', () => {
  it('filters by visibility', () => {
    expect(filterAndSortProducts(sample, { visibility: 'hidden' })).toHaveLength(1);
    expect(filterAndSortProducts(sample, { visibility: 'visible' })).toHaveLength(3);
  });

  it('filters by category and query, then sorts', () => {
    const result = filterAndSortProducts(sample, {
      category: 'Телефони',
      query: 'акуму',
      sort: 'price-asc',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('returns empty for no matches', () => {
    expect(filterAndSortProducts(sample, { query: 'немаєтакого' })).toEqual([]);
  });
});

describe('parseProductSort', () => {
  it('parses known values and defaults', () => {
    expect(parseProductSort('price-asc')).toBe('price-asc');
    expect(parseProductSort('nope')).toBe('manual');
    expect(parseProductSort(null)).toBe('manual');
  });
});

describe('collectCategories', () => {
  it('returns unique sorted categories', () => {
    expect(collectCategories(sample)).toEqual(['Ноутбуки', 'ТВ', 'Телефони']);
  });
});

describe('hasActiveCatalogParams', () => {
  it('detects active filters', () => {
    expect(hasActiveCatalogParams({})).toBe(false);
    expect(hasActiveCatalogParams({ sort: 'manual' })).toBe(false);
    expect(hasActiveCatalogParams({ query: 'x' })).toBe(true);
    expect(hasActiveCatalogParams({ sort: 'price-asc' })).toBe(true);
    expect(hasActiveCatalogParams({ category: 'ТВ' })).toBe(true);
  });
});
