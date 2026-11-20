import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Order } from './orders';

describe('orders store', () => {
  let tmpDir: string;
  let prev: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-orders-'));
    prev = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prev === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prev;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('appends, updates, deletes orders with product snapshot', async () => {
    const { appendOrder, listOrders, updateOrder, deleteOrder, countOrders } = await import('./orders');

    const a = await appendOrder({
      phone: '+380501112233',
      comment: 'Під замовлення',
      emailed: false,
      product: { id: 'p1', title: 'Акумулятор', price: 800, code: 'АКБ-12' },
    });
    expect(a.id).toBeTruthy();
    expect(a.quantity).toBe(1);
    expect(a.source).toBe('shop');
    expect(a.product.title).toBe('Акумулятор');
    expect(a.comment).toBe('Під замовлення');
    expect(await countOrders({ unhandledOnly: true })).toBe(1);

    const updated = await updateOrder(a.id, { handled: true, note: 'called' });
    expect(updated?.handled).toBe(true);
    expect(updated?.note).toBe('called');
    expect(await countOrders({ unhandledOnly: true })).toBe(0);

    const list = await listOrders();
    expect(list).toHaveLength(1);

    expect(await deleteOrder(a.id)).toBe(true);
    expect(await listOrders()).toHaveLength(0);
  });

  it('omits empty comment', async () => {
    const { appendOrder } = await import('./orders');
    const o = await appendOrder({
      phone: '+380501112233',
      comment: '   ',
      emailed: true,
      product: { id: 'x', title: 'X', price: 1 },
    });
    expect(o.comment).toBeUndefined();
    expect(o.emailed).toBe(true);
  });

  it('refuses write and preserves corrupt orders.json', async () => {
    const { appendOrder, ordersFilePath } = await import('./orders');
    const corrupt = 'corrupt orders data';
    await fs.writeFile(ordersFilePath(), corrupt, 'utf-8');

    await expect(
      appendOrder({
        phone: '+380501112233',
        emailed: false,
        product: { id: 'p1', title: 'Test', price: 100 },
      }),
    ).rejects.toThrow();

    const after = await fs.readFile(ordersFilePath(), 'utf-8');
    expect(after).toBe(corrupt);
  });

  it('drops only closed rows when cap is exceeded', async () => {
    const { appendOrder, listOrders, ordersFilePath } = await import('./orders');
    const { atomicWriteJson } = await import('./atomic-write');

    const storeOrders: Order[] = [
      {
        id: 'closed-order-1',
        createdAt: new Date().toISOString(),
        phone: '+380509999999',
        quantity: 1,
        product: { id: 'p0', title: 'Old', price: 10 },
        source: 'shop',
        emailed: false,
        handled: true,
        status: 'done',
      },
    ];
    for (let i = 0; i < 500; i++) {
      storeOrders.unshift({
        id: `open-order-${i}`,
        createdAt: new Date().toISOString(),
        phone: `+38050100${String(i).padStart(4, '0')}`,
        quantity: 1,
        product: { id: `p-${i}`, title: `Prod ${i}`, price: 10 },
        source: 'shop',
        emailed: false,
        handled: false,
        status: 'new',
      });
    }
    await atomicWriteJson(ordersFilePath(), { orders: storeOrders });

    const newest = await appendOrder({
      phone: '+380500000000',
      emailed: false,
      product: { id: 'p-new', title: 'New', price: 50 },
    });
    const list = await listOrders();
    expect(list.length).toBe(501);
    expect(list.some(o => o.id === 'closed-order-1')).toBe(false);
    expect(list.some(o => o.id === 'open-order-0')).toBe(true);
    expect(list.some(o => o.id === newest.id)).toBe(true);
  });
});
