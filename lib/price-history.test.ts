import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('price-history store', () => {
  let tmpDir: string;
  let prevDataDir: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-price-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('битий файл блокує запис і лишається недоторканим', async () => {
    const { priceHistoryPath, recordPriceChange, listPriceHistory } = await import('./price-history');
    const corrupt = '{"entries": [INVALID_JSON';
    await fs.writeFile(priceHistoryPath(), corrupt, 'utf-8');

    // recordPriceChange при битому файлі просто не пишеться
    await recordPriceChange({
      productId: 'p1',
      price: 999,
      prevPrice: 500,
    });

    const after = await fs.readFile(priceHistoryPath(), 'utf-8');
    expect(after).toBe(corrupt);

    await expect(listPriceHistory()).rejects.toThrow();
  });

  it('ENOENT дає порожній стор і записує історію цін', async () => {
    const { recordPriceChange, listPriceHistory } = await import('./price-history');
    expect(await listPriceHistory()).toEqual([]);

    await recordPriceChange({
      productId: 'p1',
      price: 600,
      prevPrice: 500,
    });

    const list = await listPriceHistory();
    expect(list).toHaveLength(1);
    expect(list[0].price).toBe(600);
  });
});
