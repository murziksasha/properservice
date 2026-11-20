import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('admin-activity store', () => {
  let tmpDir: string;
  let prevDataDir: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-act-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('битий файл блокує запис і лишається недоторканим', async () => {
    const { activityFilePath, appendActivity, listActivity } = await import('./admin-activity');
    const corrupt = '{"entries": [INVALID_JSON';
    await fs.writeFile(activityFilePath(), corrupt, 'utf-8');

    // appendActivity при битому файлі просто не пише і повертає null
    const res = await appendActivity({
      kind: 'other',
      message: 'test activity',
    });
    expect(res).toBeNull();

    const after = await fs.readFile(activityFilePath(), 'utf-8');
    expect(after).toBe(corrupt);

    await expect(listActivity()).rejects.toThrow();
  });

  it('ENOENT дає порожній стор і дозволяє запис', async () => {
    const { appendActivity, listActivity } = await import('./admin-activity');
    expect(await listActivity()).toEqual([]);

    const entry = await appendActivity({ kind: 'other', message: 'First entry' });
    expect(entry).not.toBeNull();
    const list = await listActivity();
    expect(list).toHaveLength(1);
    expect(list[0].message).toBe('First entry');
  });
});
