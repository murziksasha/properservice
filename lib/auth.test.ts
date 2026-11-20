import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockSessionCookie: string | undefined = undefined;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === 'admin_session' && mockSessionCookie ? { value: mockSessionCookie } : undefined),
    set: () => undefined,
    delete: () => undefined,
  })),
}));

const { verifyPassword } = await import('./auth');

describe('verifyPassword', () => {
  const prev = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prev;
  });

  it('returns false when ADMIN_PASSWORD is not set', () => {
    delete process.env.ADMIN_PASSWORD;
    expect(verifyPassword('anything')).toBe(false);
  });

  it('returns false for empty password', () => {
    process.env.ADMIN_PASSWORD = 'secret';
    expect(verifyPassword('')).toBe(false);
  });

  it('returns true for correct password', () => {
    process.env.ADMIN_PASSWORD = 'secret';
    expect(verifyPassword('secret')).toBe(true);
  });

  it('returns false for wrong password', () => {
    process.env.ADMIN_PASSWORD = 'secret';
    expect(verifyPassword('wrong')).toBe(false);
  });

  it('returns false when lengths differ', () => {
    process.env.ADMIN_PASSWORD = 'ab';
    expect(verifyPassword('abc')).toBe(false);
  });
});

describe('authenticateLogin and multi-user mode', () => {
  let tmpDir: string;
  let prevDataDir: string | undefined;
  const prevAdminPassword = process.env.ADMIN_PASSWORD;
  const prevSessionSecret = process.env.SESSION_SECRET;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ps-auth-'));
    prevDataDir = process.env.DATA_DIR;
    process.env.DATA_DIR = tmpDir;
    process.env.ADMIN_PASSWORD = 'env-secret-password';
    process.env.SESSION_SECRET = 'test-secret-1234567890-test-secret';
    mockSessionCookie = undefined;
  });

  afterEach(async () => {
    if (prevDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = prevDataDir;
    if (prevAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prevAdminPassword;
    if (prevSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = prevSessionSecret;
    mockSessionCookie = undefined;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('Без admins.json пароль із середовища входить', async () => {
    const { authenticateLogin } = await import('./auth');
    const resNoUser = await authenticateLogin({ password: 'env-secret-password' });
    expect(resNoUser.ok).toBe(true);

    const resAdminUser = await authenticateLogin({ username: 'admin', password: 'env-secret-password' });
    expect(resAdminUser.ok).toBe(true);
  });

  it('З користувачем owner: пароль середовища не входить, входить лише власник, verifyOwnerStepUp приймає лише пароль власника', async () => {
    const { createAdminUser } = await import('./admin-users');
    await createAdminUser({
      username: 'shop_boss',
      password: 'BossStrongPassword123',
      role: 'owner',
    });

    const { authenticateLogin, verifyOwnerStepUp } = await import('./auth');

    // Той самий пароль середовища не входить ні з порожнім ім'ям, ні з ім'ям admin
    const envNoName = await authenticateLogin({ password: 'env-secret-password' });
    expect(envNoName.ok).toBe(false);

    const envWithAdmin = await authenticateLogin({ username: 'admin', password: 'env-secret-password' });
    expect(envWithAdmin.ok).toBe(false);

    // Входить лише пара ім'я власника та його власний пароль
    const ownerWrongPass = await authenticateLogin({ username: 'shop_boss', password: 'wrongpassword' });
    expect(ownerWrongPass.ok).toBe(false);

    const ownerCorrect = await authenticateLogin({ username: 'shop_boss', password: 'BossStrongPassword123' });
    expect(ownerCorrect.ok).toBe(true);
    if (ownerCorrect.ok) {
      expect(ownerCorrect.claims.username).toBe('shop_boss');
      expect(ownerCorrect.claims.role).toBe('owner');
    }

    // verifyOwnerStepUp для цього власника приймає його пароль і відхиляє ADMIN_PASSWORD
    expect(await verifyOwnerStepUp('BossStrongPassword123', 'shop_boss')).toBe(true);
    expect(await verifyOwnerStepUp('env-secret-password', 'shop_boss')).toBe(false);
    expect(await verifyOwnerStepUp('wrong-password', 'shop_boss')).toBe(false);
  });

  it('legacy cookie гасне, щойно з’явився активний власник', async () => {
    const { createSessionToken } = await import('./session');
    const { getSession, getSessionClaims } = await import('./auth');
    const { createAdminUser } = await import('./admin-users');

    const legacyCookie = await createSessionToken({ username: 'admin', role: 'legacy' });
    const legacy3PartCookie = await createSessionToken();
    const ownerCookie = await createSessionToken({ username: 'shop_boss', role: 'owner' });

    // 1. Файлу користувачів немає, та сама cookie — getSession() дає true
    mockSessionCookie = legacyCookie;
    expect(await getSession()).toBe(true);
    expect(await getSessionClaims()).toEqual({ username: 'admin', role: 'legacy' });

    mockSessionCookie = legacy3PartCookie;
    expect(await getSession()).toBe(true);
    expect(await getSessionClaims()).toEqual({ username: 'admin', role: 'legacy' });

    // Створюємо активного власника
    await createAdminUser({
      username: 'shop_boss',
      password: 'BossStrongPassword123',
      role: 'owner',
    });

    // 2. Є активний власник, cookie з роллю legacy — getSession() дає false
    mockSessionCookie = legacyCookie;
    expect(await getSession()).toBe(false);
    expect(await getSessionClaims()).toBeNull();

    mockSessionCookie = legacy3PartCookie;
    expect(await getSession()).toBe(false);
    expect(await getSessionClaims()).toBeNull();

    // 3. Є власник, cookie з роллю owner — getSession() дає true
    mockSessionCookie = ownerCookie;
    expect(await getSession()).toBe(true);
    expect(await getSessionClaims()).toEqual({ username: 'shop_boss', role: 'owner' });
  });
});
