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

export interface OrderAuditEntry {
  at: string;
  action: 'created' | 'handled' | 'reopened' | 'note';
  detail?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  phone: string;
  comment?: string;
  quantity: 1;
  product: OrderProductSnapshot;
  source: 'shop';
  emailed: boolean;
  handled: boolean;
  note?: string;
  handledAt?: string;
  audit?: OrderAuditEntry[];
  telegram?: boolean;
}

export interface OrdersStore {
  orders: Order[];
}

const MAX_ORDERS = 500;
const MAX_AUDIT = 30;

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

function pushAudit(order: Order, entry: OrderAuditEntry): OrderAuditEntry[] {
  const list = [...(order.audit || []), entry];
  return list.slice(-MAX_AUDIT);
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
  telegram?: boolean;
}): Promise<Order> {
  const store = await readStore();
  const comment = (input.comment || '').trim();
  const now = new Date().toISOString();
  const order: Order = {
    id: createId(),
    createdAt: now,
    phone: input.phone,
    comment: comment || undefined,
    quantity: 1,
    product: input.product,
    source: 'shop',
    emailed: input.emailed,
    handled: false,
    ...(typeof input.telegram === 'boolean' ? { telegram: input.telegram } : {}),
    audit: [{ at: now, action: 'created' }],
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
  const now = new Date().toISOString();
  let audit = current.audit || [];

  if (typeof patch.handled === 'boolean' && patch.handled !== current.handled) {
    audit = pushAudit(
      { ...current, audit },
      { at: now, action: patch.handled ? 'handled' : 'reopened' },
    );
  }
  if (patch.note !== undefined && patch.note !== current.note) {
    audit = pushAudit(
      { ...current, audit },
      { at: now, action: 'note', detail: String(patch.note).slice(0, 200) },
    );
  }

  const next: Order = {
    ...current,
    handled: typeof patch.handled === 'boolean' ? patch.handled : current.handled,
    note: patch.note !== undefined ? patch.note : current.note,
    audit,
    handledAt:
      typeof patch.handled === 'boolean'
        ? patch.handled
          ? now
          : undefined
        : current.handledAt,
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
