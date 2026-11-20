import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { navAllowedForRole, roleCan } from './admin-roles';

describe('roleCan', () => {
  it('owner and legacy can everything', () => {
    expect(roleCan('owner', 'users')).toBe(true);
    expect(roleCan('legacy', 'restore_backup')).toBe(true);
    expect(roleCan('owner', 'content')).toBe(true);
  });

  it('editor cannot manage users or restore', () => {
    expect(roleCan('editor', 'content')).toBe(true);
    expect(roleCan('editor', 'media')).toBe(true);
    expect(roleCan('editor', 'inbox')).toBe(true);
    expect(roleCan('editor', 'users')).toBe(false);
    expect(roleCan('editor', 'restore_backup')).toBe(false);
  });

  it('operator only inbox ops', () => {
    expect(roleCan('operator', 'inbox')).toBe(true);
    expect(roleCan('operator', 'leads')).toBe(true);
    expect(roleCan('operator', 'content')).toBe(false);
    expect(roleCan('operator', 'media')).toBe(false);
    expect(roleCan('operator', 'users')).toBe(false);
  });
});

describe('navAllowedForRole', () => {
  it('operator limited nav', () => {
    expect(navAllowedForRole('operator', '/admin')).toBe(true);
    expect(navAllowedForRole('operator', '/admin/inbox')).toBe(true);
    expect(navAllowedForRole('operator', '/admin/goods')).toBe(false);
    expect(navAllowedForRole('editor', '/admin/goods')).toBe(true);
  });
});

describe('admin-users store', () => {
  let tmpDir: string;
  let prev: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-admins-'));
    prev = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (prev === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prev;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('refuses write and preserves corrupt admins.json', async () => {
    const { createAdminUser, adminsFilePath } = await import('./admin-users');
    const corrupt = 'corrupt admin users content';
    await fs.writeFile(adminsFilePath(), corrupt, 'utf-8');

    await expect(
      createAdminUser({
        username: 'newadmin',
        password: 'password123',
        role: 'operator',
      }),
    ).rejects.toThrow();

    const after = await fs.readFile(adminsFilePath(), 'utf-8');
    expect(after).toBe(corrupt);
  });
});
