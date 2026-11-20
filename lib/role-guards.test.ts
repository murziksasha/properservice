import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSessionToken } from './session';

let mockSessionCookie: string | undefined = undefined;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === 'admin_session' && mockSessionCookie ? { value: mockSessionCookie } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('role guards and operator 403 restrictions', () => {
  beforeEach(() => {
    mockSessionCookie = undefined;
    process.env.SESSION_SECRET = 'test-secret-1234567890-test-secret';
  });

  it('requireAdminRole returns 401 when unauthenticated', async () => {
    const { requireAdminRole } = await import('./require-role');
    const result = await requireAdminRole('content');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it('requireAdminRole returns 403 for operator on content and media, but allows inbox', async () => {
    mockSessionCookie = await createSessionToken({ username: 'operator_user', role: 'operator' });
    const { requireAdminRole } = await import('./require-role');

    const contentRes = await requireAdminRole('content');
    expect(contentRes.ok).toBe(false);
    if (!contentRes.ok) {
      expect(contentRes.response.status).toBe(403);
      const data = await contentRes.response.json();
      expect(data.error).toBe('Forbidden');
      expect(data.needRole).toBe('content');
    }

    const mediaRes = await requireAdminRole('media');
    expect(mediaRes.ok).toBe(false);
    if (!mediaRes.ok) {
      expect(mediaRes.response.status).toBe(403);
      const data = await mediaRes.response.json();
      expect(data.error).toBe('Forbidden');
      expect(data.needRole).toBe('media');
    }

    const inboxRes = await requireAdminRole('inbox');
    expect(inboxRes.ok).toBe(true);
    if (inboxRes.ok) {
      expect(inboxRes.role).toBe('operator');
      expect(inboxRes.username).toBe('operator_user');
    }
  });

  it('POST /api/revisions returns 403 Forbidden for operator', async () => {
    mockSessionCookie = await createSessionToken({ username: 'op1', role: 'operator' });
    const { POST } = await import('@/app/api/revisions/route');

    const req = new NextRequest('http://localhost:3000/api/revisions', {
      method: 'POST',
      body: JSON.stringify({ action: 'restore', pageId: 'p1', revId: 'r1' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
    expect(json.needRole).toBe('content');
  });

  it('POST /api/upload returns 403 Forbidden for operator', async () => {
    mockSessionCookie = await createSessionToken({ username: 'op1', role: 'operator' });
    const { POST } = await import('@/app/api/upload/route');

    const req = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
    expect(json.needRole).toBe('media');
  });

  it('POST /api/media/purge returns 403 Forbidden for operator', async () => {
    mockSessionCookie = await createSessionToken({ username: 'op1', role: 'operator' });
    const { POST } = await import('@/app/api/media/purge/route');

    const req = new NextRequest('http://localhost:3000/api/media/purge', {
      method: 'POST',
      body: JSON.stringify({ names: ['test.jpg'] }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
    expect(json.needRole).toBe('media');
  });

  it('POST /api/media/folders returns 403 Forbidden for operator', async () => {
    mockSessionCookie = await createSessionToken({ username: 'op1', role: 'operator' });
    const { POST } = await import('@/app/api/media/folders/route');

    const req = new NextRequest('http://localhost:3000/api/media/folders', {
      method: 'POST',
      body: JSON.stringify({ label: 'New Folder' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('Forbidden');
    expect(json.needRole).toBe('media');
  });
});
