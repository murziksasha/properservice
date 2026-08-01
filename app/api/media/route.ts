import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { assertAdminIp } from '@/lib/require-admin-ip';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { deleteUpload, listUploads } from '@/lib/media';
import { patchMediaMeta } from '@/lib/media-index';
import { isMediaPurpose } from '@/lib/media-purpose';

export const dynamic = 'force-dynamic';

async function guard() {
  const ipGate = await assertAdminIp();
  if (!ipGate.ok) {
    return { ok: false as const, response: NextResponse.json({ error: ipGate.error }, { status: ipGate.status }) };
  }
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  const purposeRaw = request.nextUrl.searchParams.get('purpose') || '';
  const purpose =
    purposeRaw && purposeRaw !== 'all' && isMediaPurpose(purposeRaw) ? purposeRaw : undefined;
  const q = request.nextUrl.searchParams.get('q') || undefined;
  const tag = request.nextUrl.searchParams.get('tag') || undefined;

  const items = await listUploads({ purpose, q, tag });
  return NextResponse.json({
    items,
    count: items.length,
    bytes: items.reduce((s, i) => s + i.size, 0),
  });
}

export async function PATCH(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  const rl = rateLimit(clientKey(request, 'media-patch'), { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      purpose?: string;
      tags?: string[] | string;
      alt?: string;
    };
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }
    const purpose =
      body.purpose && isMediaPurpose(body.purpose) ? body.purpose : undefined;
    let tags: string[] | undefined;
    if (Array.isArray(body.tags)) {
      tags = body.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean);
    } else if (typeof body.tags === 'string') {
      tags = body.tags
        .split(/[,;]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }
    const meta = await patchMediaMeta(body.name, {
      purpose,
      tags,
      alt: typeof body.alt === 'string' ? body.alt : undefined,
    });
    if (!meta) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: meta });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const g = await guard();
  if (!g.ok) return g.response;

  const rl = rateLimit(clientKey(request, 'media-delete'), { limit: 40, windowMs: 60_000 });
  if (!rl.allowed) {
    const retryAfter = Math.ceil(rl.retryAfterMs / 1000) || 60;
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const body = (await request.json()) as { name?: string };
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }
    const ok = await deleteUpload(body.name);
    if (!ok) {
      return NextResponse.json({ error: 'Not found or invalid name' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
