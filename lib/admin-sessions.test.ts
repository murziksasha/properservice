import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('admin-sessions store', () => {
  let tmpDir: string;
  let prevDataDir: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-sessions-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('битий admin-sessions.json після registerSession лишається байт-у-байт тим самим, а isSessionAllowed повертає false', async () => {
    const { registerSession, isSessionAllowed, sessionsFilePath } = await import('./admin-sessions');
    const filePath = sessionsFilePath();
    const corruptContent = '{"sessions": [INVALID_JSON_HERE';
    await fs.writeFile(filePath, corruptContent, 'utf-8');

    // registerSession must throw and preserve corrupt file without overwriting
    await expect(
      registerSession({
        fingerprint: 'fp_123',
        username: 'admin',
        role: 'owner',
      }),
    ).rejects.toThrow();

    const fileAfter = await fs.readFile(filePath, 'utf-8');
    expect(fileAfter).toBe(corruptContent);

    // isSessionAllowed must return false on corrupt file (fail-closed denylist)
    const allowed = await isSessionAllowed('fp_123');
    expect(allowed).toBe(false);
  });

  it('немає файлу — сесія дозволена, далі звичайний запис', async () => {
    const { registerSession, isSessionAllowed, listSessions } = await import('./admin-sessions');
    expect(await isSessionAllowed('fp_new')).toBe(true);

    const rec = await registerSession({
      fingerprint: 'fp_new',
      username: 'admin',
      role: 'owner',
    });
    expect(rec.fingerprint).toBe('fp_new');
    expect(await listSessions()).toHaveLength(1);
    expect(await isSessionAllowed('fp_new')).toBe(true);
  });

  it('{} і []: isSessionAllowed дає false, байти файлу ті самі, registerSession кидає помилку', async () => {
    const { registerSession, isSessionAllowed, sessionsFilePath } = await import('./admin-sessions');
    const filePath = sessionsFilePath();

    for (const content of ['{}', '[]']) {
      await fs.writeFile(filePath, content, 'utf-8');
      expect(await isSessionAllowed('fp_any')).toBe(false);

      await expect(
        registerSession({
          fingerprint: 'fp_any',
          username: 'admin',
          role: 'owner',
        }),
      ).rejects.toThrow();

      expect(await fs.readFile(filePath, 'utf-8')).toBe(content);
    }
  });

  it('{ "sessions": [] } дає true', async () => {
    const { isSessionAllowed, sessionsFilePath } = await import('./admin-sessions');
    await fs.writeFile(sessionsFilePath(), JSON.stringify({ sessions: [] }), 'utf-8');
    expect(await isSessionAllowed('fp_any')).toBe(true);
  });

  it('{ "sessions": [], "revoked": ["fp"] } дає false для fp і true для іншого відбитка', async () => {
    const { isSessionAllowed, sessionsFilePath } = await import('./admin-sessions');
    await fs.writeFile(sessionsFilePath(), JSON.stringify({ sessions: [], revoked: ['fp'] }), 'utf-8');
    expect(await isSessionAllowed('fp')).toBe(false);
    expect(await isSessionAllowed('other_fp')).toBe(true);
  });

  it('{ "sessions": [], "revoked": "nope" } дає false', async () => {
    const { isSessionAllowed, sessionsFilePath } = await import('./admin-sessions');
    await fs.writeFile(sessionsFilePath(), JSON.stringify({ sessions: [], revoked: 'nope' }), 'utf-8');
    expect(await isSessionAllowed('fp_any')).toBe(false);
  });
});
