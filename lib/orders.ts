import { promises as fs } from 'fs';
import path from 'path';
import { atomicWriteJson } from './atomic-write';
import { createId } from './id';

export interface OrderProductSnapshot {
  id: string;
  title: string;
  price: number;
  code?: string;
  image?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  phone: string;
  comment?: string;
  /** Always 1 in v1 */
  quantity: 1;
  product: OrderProductSnapshot;
  source: 'shop';
  emailed: boolean;
  handled: boolean;
  note?: string;
}

export interface OrdersStore {
  orders: Order[];
}

const MAX_ORDERS = 500;

function dataRoot(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), 'data');
}

export function ordersFilePath(): string {
  return path.join(dataRoot(), 'orders.json');
}

async function readStore(): Promise<OrdersStore> {
  try {
    const raw = await fs.readFile(ordersFilePath(), 'utf-8');
    const parsed = JSON.parse(raw) as OrdersStore;
    if (!parsed || !Array.isArray(parsed.orders)) return { orders: [] };
    return parsed;
  } catch {
    return { orders: [] };
  }
}

async function writeStore(store: OrdersStore): Promise<void> {
  await atomicWriteJson(ordersFilePath(), store);
}

export async function listOrders(): Promise<Order[]> {
  const store = await readStore();
  return store.orders;
}

export async function countOrders(options?: { unhandledOnly?: boolean }): Promise<number> {
  const orders = await listOrders();
  if (options?.unhandledOnly) return orders.filter((o) => !o.handled).length;
  return orders.length;
}

export async function appendOrder(input: {
  phone: string;
  comment?: string;
  product: OrderProductSnapshot;
  emailed: boolean;
}): Promise<Order> {
  const store = await readStore();
  const comment = (input.comment || '').trim();
  const order: Order = {
    id: createId(),
    createdAt: new Date().toISOString(),
    phone: input.phone,
    comment: comment || undefined,
    quantity: 1,
    product: input.product,
    source: 'shop',
    emailed: input.emailed,
    handled: false,
  };
  store.orders.unshift(order);
  if (store.orders.length > MAX_ORDERS) {
    store.orders = store.orders.slice(0, MAX_ORDERS);
  }
  await writeStore(store);
  return order;
}

export async function updateOrder(
  id: string,
  patch: Partial<Pick<Order, 'handled' | 'note'>>,
): Promise<Order | null> {
  const store = await readStore();
  const idx = store.orders.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  const current = store.orders[idx];
  const next: Order = {
    ...current,
    handled: typeof patch.handled === 'boolean' ? patch.handled : current.handled,
    note: patch.note !== undefined ? patch.note : current.note,
  };
  store.orders[idx] = next;
  await writeStore(store);
  return next;
}

export async function deleteOrder(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.orders.length;
  store.orders = store.orders.filter((o) => o.id !== id);
  if (store.orders.length === before) return false;
  await writeStore(store);
  return true;
}
