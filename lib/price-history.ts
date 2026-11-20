import { promises as fs } from 'fs';
import path from 'path';
import { atomicWriteJson } from './atomic-write';

export type PricePoint = {
  at: string;
  productId: string;
  price: number;
  title?: string;
};

type Store = { entries: PricePoint[] };

const MAX = 2000;

function dataRoot(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), 'data');
}

export function priceHistoryPath(): string {
  return path.join(dataRoot(), 'price-history.json');
}

async function readStore(): Promise<Store> {
  let raw: string;
  try {
    raw = await fs.readFile(priceHistoryPath(), 'utf-8');
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ENOENT') {
      return { entries: [] };
    }
    console.error(`[price-history] failed to read ${priceHistoryPath()}:`, err);
    throw err;
  }

  try {
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || !Array.isArray(parsed.entries)) {
      throw new Error(`Invalid price history store format in ${priceHistoryPath()}`);
    }
    return parsed;
  } catch (err) {
    console.error(`[price-history] corrupt price-history.json at ${priceHistoryPath()}:`, err);
    throw err;
  }
}

async function writeStore(store: Store): Promise<void> {
  await atomicWriteJson(priceHistoryPath(), store);
}

export async function recordPriceChange(input: {
  productId: string;
  price: number;
  title?: string;
  prevPrice?: number;
}): Promise<void> {
  if (typeof input.prevPrice === 'number' && input.prevPrice === input.price) return;
  let store: Store;
  try {
    store = await readStore();
  } catch (err) {
    console.error('[price-history] skipping recordPriceChange due to corrupt or unreadable store:', err);
    return;
  }
  store.entries.unshift({
    at: new Date().toISOString(),
    productId: input.productId,
    price: input.price,
    title: input.title,
  });
  if (store.entries.length > MAX) store.entries = store.entries.slice(0, MAX);
  try {
    await writeStore(store);
  } catch (err) {
    console.error('[price-history] failed to write store:', err);
  }
}

export async function listPriceHistory(productId?: string, limit = 50): Promise<PricePoint[]> {
  const store = await readStore();
  let list = store.entries;
  if (productId) list = list.filter(e => e.productId === productId);
  return list.slice(0, Math.max(1, Math.min(limit, 200)));
}
