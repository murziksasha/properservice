import { describe, expect, it } from 'vitest';
import type { Product } from './types';
import {
  UNCATEGORIZED_KEY,
  UNCATEGORIZED_LABEL,
  collectCategories,
  filterAndSortProducts,
  groupProductsByCategory,
  hasActiveCatalogParams,
  matchesProductQuery,
  normalizeQuery,
  parseProductSort,
  productCategoryKey,
  renameCategoryInGoods,
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
  p({ id: '1', title: 'Екран iPhone', price: 1200, description: 'Оригінал', category: 'Телефони', code: 'IP-SCR#01' }),
  p({ id: '2', title: 'Блок живлення', price: 350, description: 'TV / монітор', category: 'ТВ', visible: false }),
  p({ id: '3', title: 'Акумулятор', price: 800, description: 'для телефону', category: 'Телефони', code: 'АКБ-12' }),
  p({ id: '4', title: 'Клавіатура', price: 350, description: 'USB', category: 'Ноутбуки', code: 'sku/орг#1' }),
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

  it('matches product code (case-insensitive, symbols, unicode)', () => {
    expect(matchesProductQuery(sample[0], 'ip-scr')).toBe(true);
    expect(matchesProductQuery(sample[0], 'SCR#01')).toBe(true);
    expect(matchesProductQuery(sample[2], 'акб')).toBe(true);
    expect(matchesProductQuery(sample[3], 'орг#')).toBe(true);
    expect(matchesProductQuery(sample[3], 'sku/')).toBe(true);
    expect(matchesProductQuery(sample[1], 'ip-scr')).toBe(false);
  });

  it('empty or missing code does not break search', () => {
    expect(matchesProductQuery(sample[1], 'блок')).toBe(true);
    expect(matchesProductQuery(p({ id: 'x', title: 'X', price: 1, code: '' }), 'x')).toBe(true);
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

describe('groupProductsByCategory', () => {
  it('groups in first-seen order and puts uncategorized last', () => {
    const withNone = [
      ...sample,
      p({ id: '5', title: 'Тест', price: 1, category: '' }),
      p({ id: '6', title: 'Ще', price: 2 }),
    ];
    const groups = groupProductsByCategory(withNone);
    expect(groups.map((g) => g.key)).toEqual(['Телефони', 'ТВ', 'Ноутбуки', UNCATEGORIZED_KEY]);
    expect(groups[0].products.map((x) => x.id)).toEqual(['1', '3']);
    expect(groups[groups.length - 1].label).toBe(UNCATEGORIZED_LABEL);
    expect(groups[groups.length - 1].total).toBe(2);
  });

  it('counts visible per group', () => {
    const groups = groupProductsByCategory(sample);
    const tv = groups.find((g) => g.key === 'ТВ');
    expect(tv?.total).toBe(1);
    expect(tv?.visibleCount).toBe(0);
  });

  it('localeSortCategories sorts named groups alphabetically', () => {
    const groups = groupProductsByCategory(sample, { localeSortCategories: true });
    expect(groups.map((g) => g.key)).toEqual(['Ноутбуки', 'ТВ', 'Телефони']);
  });
});

describe('renameCategoryInGoods', () => {
  it('renames matching category; empty to clears field', () => {
    const next = renameCategoryInGoods(sample, 'Телефони', 'Смартфони');
    expect(next.filter((x) => x.category === 'Смартфони')).toHaveLength(2);
    expect(next.find((x) => x.id === '2')?.category).toBe('ТВ');
    const cleared = renameCategoryInGoods(sample, 'ТВ', '  ');
    expect(cleared.find((x) => x.id === '2')?.category).toBeUndefined();
  });

  it('no-op on empty from or same name', () => {
    expect(renameCategoryInGoods(sample, '', 'X')).toBe(sample);
    expect(renameCategoryInGoods(sample, 'Телефони', 'Телефони')).toBe(sample);
  });
});

describe('matchesCategory uncategorized', () => {
  it('filters products without category via sentinel', () => {
    const list = [...sample, p({ id: 'u', title: 'U', price: 1 })];
    const onlyNone = filterAndSortProducts(list, { category: UNCATEGORIZED_KEY });
    expect(onlyNone.map((x) => x.id)).toEqual(['u']);
  });
});

describe('productCategoryKey', () => {
  it('returns sentinel for empty category', () => {
    expect(productCategoryKey(p({ id: 'a', title: 'A', price: 1 }))).toBe(UNCATEGORIZED_KEY);
    expect(productCategoryKey(p({ id: 'a', title: 'A', price: 1, category: '  Телефони ' }))).toBe(
      'Телефони',
    );
  });
});
