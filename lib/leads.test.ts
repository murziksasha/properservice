import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Lead } from './leads';

describe('leads store', () => {
  let tmpDir: string;
  let prev: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-leads-'));
    prev = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prev === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prev;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('appends, updates, deletes leads', async () => {
    const { appendLead, listLeads, updateLead, deleteLead, countLeads } = await import('./leads');

    const a = await appendLead({
      phone: '+380501112233',
      emailed: false,
      pagePath: '/phones',
    });
    expect(a.id).toBeTruthy();
    expect(a.pagePath).toBe('/phones');
    expect(a.emailed).toBe(false);
    expect(await countLeads({ unhandledOnly: true })).toBe(1);

    const marked = await updateLead(a.id, { emailed: true });
    expect(marked?.emailed).toBe(true);

    const updated = await updateLead(a.id, { handled: true, note: 'called' });
    expect(updated?.handled).toBe(true);
    expect(updated?.note).toBe('called');
    expect(updated?.emailed).toBe(true);
    expect(await countLeads({ unhandledOnly: true })).toBe(0);

    const list = await listLeads();
    expect(list).toHaveLength(1);
    expect(list[0].pagePath).toBe('/phones');

    expect(await deleteLead(a.id)).toBe(true);
    expect(await listLeads()).toHaveLength(0);
  });

  it('refuses write and preserves corrupt leads.json', async () => {
    const { appendLead, leadsFilePath } = await import('./leads');
    const corrupt = 'not valid json at all';
    await fs.writeFile(leadsFilePath(), corrupt, 'utf-8');

    await expect(
      appendLead({
        phone: '+380501112233',
        emailed: false,
      }),
    ).rejects.toThrow();

    const after = await fs.readFile(leadsFilePath(), 'utf-8');
    expect(after).toBe(corrupt);
  });

  it('drops only closed rows when cap is exceeded', async () => {
    const { appendLead, listLeads } = await import('./leads');
    const { atomicWriteJson } = await import('./atomic-write');
    const { leadsFilePath } = await import('./leads');

    const storeLeads: Lead[] = [
      {
        id: 'closed-1',
        phone: '+380509999999',
        createdAt: new Date().toISOString(),
        source: 'callback',
        emailed: false,
        handled: true,
        status: 'done',
      },
    ];
    for (let i = 0; i < 500; i++) {
      storeLeads.unshift({
        id: `open-${i}`,
        phone: `+38050100${String(i).padStart(4, '0')}`,
        createdAt: new Date().toISOString(),
        source: 'callback',
        emailed: false,
        handled: false,
        status: 'new',
      });
    }
    await atomicWriteJson(leadsFilePath(), { leads: storeLeads });

    const newest = await appendLead({ phone: '+380500000000', emailed: false });
    const list = await listLeads();
    expect(list.length).toBe(501);
    expect(list.some(l => l.id === 'closed-1')).toBe(false);
    expect(list.some(l => l.id === 'open-0')).toBe(true);
    expect(list.some(l => l.id === newest.id)).toBe(true);
  });
});
