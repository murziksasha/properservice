import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Page } from './types';

describe('page revisions', () => {
  let tmpDir: string;
  let prevDataDir: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-rev-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('битий файл ревізії викидає помилку і не повертає підроблені дані', async () => {
    const { getPageRevision } = await import('./revisions');
    const revDir = path.join(tmpDir, 'revisions', 'page1');
    await fs.mkdir(revDir, { recursive: true });
    const corruptFile = path.join(revDir, 'rev1.json');
    await fs.writeFile(corruptFile, '{ corrupt-revision-json', 'utf-8');

    await expect(getPageRevision('page1', 'rev1')).rejects.toThrow();

    const after = await fs.readFile(corruptFile, 'utf-8');
    expect(after).toBe('{ corrupt-revision-json');
  });

  it('ENOENT повертає null, збереження записує ревізію', async () => {
    const { getPageRevision, savePageRevision } = await import('./revisions');
    expect(await getPageRevision('page1', 'nonexistent')).toBeNull();

    const testPage: Page = {
      id: 'page1',
      slug: 'test',
      title: 'Test Page',
      description: 'Desc',
      visible: true,
      sections: [],
    };

    const savedMeta = await savePageRevision(testPage, { label: 'Initial' });
    expect(savedMeta.pageId).toBe('page1');

    const loaded = await getPageRevision('page1', savedMeta.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.page.title).toBe('Test Page');
  });
});
