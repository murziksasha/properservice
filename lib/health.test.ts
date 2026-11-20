import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('health helpers', () => {
  let tmpDir: string;
  let prevDataDir: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-health-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('getPublicHealth self-heals by seeding site.json when file is missing', async () => {
    const { getPublicHealth } = await import('./health');
    const sitePath = path.join(tmpDir, 'site.json');

    // Verify file is missing before call
    let existsBefore = true;
    try {
      await fs.access(sitePath);
    } catch {
      existsBefore = false;
    }
    expect(existsBefore).toBe(false);

    const report = await getPublicHealth();
    expect(report.ok).toBe(true);
    expect(report.service).toBe('properservice');
    expect(typeof report.uptimeSec).toBe('number');

    // Verify site.json was created
    const raw = await fs.readFile(sitePath, 'utf-8');
    expect(raw).toContain('settings');
  });

  it('getHealthReport returns healthy report and ensures dataFile is true', async () => {
    const { getHealthReport } = await import('./health');
    const report = await getHealthReport();
    expect(report.ok).toBe(true);
    expect(report.dataFile).toBe(true);
    expect(report.service).toBe('properservice');
    expect(typeof report.uptimeSec).toBe('number');
  });
});
